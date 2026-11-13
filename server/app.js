const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const { connectDb, dbState, hashPassword, User, App, AppVersion, Session } = require('./database');

const app = express();

// Railway/Vercel sit in front of the API — trust X-Forwarded-For so req.ip is the
// real client, not the proxy (otherwise every user shares one rate-limit bucket).
app.set('trust proxy', true);

const ALLOWED_ORIGINS = [
  'https://store.primersgroup.ng',
  'https://primers-store-ruddy.vercel.app',
  'https://primers-store-liard.vercel.app',
  'http://localhost:5173',
  'http://localhost:3001',
];

async function autoSeed() {
  if (process.env.SKIP_SEED === '1') return;
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    // Production never gets publicly known passwords: the admin needs ADMIN_PASSWORD, and the
    // publisher account behind seeded apps gets a random password nobody knows.
    const prod = process.env.NODE_ENV === 'production';
    const random = () => crypto.randomBytes(24).toString('base64url');
    const adminPassword = process.env.ADMIN_PASSWORD || (prod ? null : 'admin123');
    console.log('🌱 First run — seeding accounts...');
    if (adminPassword) {
      await User.create({ username: 'admin', email: process.env.ADMIN_EMAIL || 'admin@primers.store', password_hash: hashPassword(adminPassword), display_name: 'Primers Admin', role: 'admin', email_verified: true });
    } else {
      console.warn('⚠️  No ADMIN_PASSWORD set: no admin account seeded. Set it and redeploy to create one.');
    }
    await User.create({ username: 'demo-dev', email: 'dev@primers.store', password_hash: hashPassword(prod ? random() : 'dev123456'), display_name: 'Primers Group', role: 'developer', email_verified: true });
    if (!prod) await User.create({ username: 'demo-user', email: 'user@primers.store', password_hash: hashPassword('user123456'), display_name: 'Demo User', role: 'user', email_verified: true });
  }

  const appCount = await App.countDocuments();
  if (appCount === 0) {
    const dev = await User.findOne({ email: 'dev@primers.store' });
    if (!dev) return;
    console.log('📦 Seeding Presona...');
    const presona = await App.create({
      developer_id: dev._id,
      name: 'Presona',
      slug: 'presona',
      description: 'Presona is a fully offline AI agent that knows your work, not just your files. It tracks your projects, detects what\'s active, blocked, or going stale, cleans up your storage, and delivers a daily narrative of everything you\'re working on — all powered by PrimersGPT running entirely on your machine.\n\nFeatures:\n• Project tracking with active/blocked/stale detection\n• Daily work narrative generation\n• Storage cleanup and duplicate detection\n• System tray operation (stays alive when window closed)\n• Desktop notifications\n• Zero cloud, zero login, zero subscription\n\nPowered by PrimersGPT — built on phi4-mini and nomic-embed-text through a fully hidden Ollama layer.',
      short_description: 'Your personal AI agent. Fully offline. Knows your work. Powered by PrimersGPT.',
      category: 'Productivity',
      website: 'https://github.com/Jothankato05/primers-store/releases/tag/v1.0.0',
      status: 'approved',
      published_at: new Date(),
    });
    await AppVersion.create({
      app_id: presona._id,
      version: '1.0.0',
      changelog: 'Initial release — the first app on Primers Store.',
      file_url: 'https://archive.org/download/presona-installer/Presona-Installer.exe',
      file_size: 1640000000,
      platform: 'windows',
      status: 'approved',
    });
    console.log('✅ Presona seeded');
  }
}

async function cleanupSessions() {
  try {
    const result = await Session.deleteMany({ expires_at: { $lt: new Date() } });
    if (result.deletedCount > 0) console.log(`🧹 Removed ${result.deletedCount} expired sessions`);
  } catch (e) {
    console.error('Session cleanup error:', e.message);
  }
}

// Middleware
app.use(cors({
  origin: (origin, cb) => {
    // Allow no-origin requests and Electron's "null" origin (custom protocol)
    if (!origin || origin === 'null') return cb(null, true);
    const extraOrigin = process.env.CORS_ORIGIN;
    if (
      ALLOWED_ORIGINS.includes(origin) ||
      (extraOrigin && origin === extraOrigin) ||
      /^https:\/\/primers-store[a-z0-9-]*\.vercel\.app$/.test(origin)
    ) return cb(null, true);
    cb(new Error('CORS: origin not allowed'));
  },
  credentials: true,
}));
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Files uploaded before storage moved to Vercel Blob (local development only)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// TEMPORARY (migration from Railway): which database in the cluster holds the store's data.
// Needs DIAG_TOKEN; counts only, no records. Remove after the move.
app.get('/api/_diag', async (req, res) => {
  const t = process.env.DIAG_TOKEN;
  if (!t || req.query.t !== t) return res.status(404).json({ error: 'Not found' });
  try {
    await connectDb(); // connect only: never seed while we're still finding the right database
    const mongoose = require('mongoose');
    const client = mongoose.connection.getClient();
    const { databases } = await client.db().admin().listDatabases({ nameOnly: true });
    const out = [];
    for (const { name } of databases) {
      if (['admin', 'local', 'config'].includes(name)) continue;
      const db = client.db(name);
      const cols = (await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name);
      const count = async (c) => cols.includes(c) ? db.collection(c).countDocuments() : null;
      out.push({ name, users: await count('users'), apps: await count('apps'), appversions: await count('appversions') });
    }
    res.json({ current: mongoose.connection.name, databases: out });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Serverless-friendly database start: connect once per instance, seed once, and clean up
// expired sessions at most hourly. A failed connect is retried on the next request.
let ready = null;
let lastCleanup = 0;
function ensureDb() {
  if (!ready) {
    ready = (async () => { await connectDb(); await autoSeed(); })().catch(err => { ready = null; throw err; });
  }
  return ready;
}
app.use(async (req, res, next) => {
  if (req.path === '/api/health' || req.path === '/api/download/desktop') return next();
  try {
    await ensureDb();
  } catch (err) {
    console.error('MongoDB unavailable:', err.message);
    return res.status(503).json({ error: 'The store is temporarily unavailable. Please try again in a moment.' });
  }
  if (Date.now() - lastCleanup > 60 * 60 * 1000) { lastCleanup = Date.now(); cleanupSessions(); }
  next();
});

// Auth middleware (sets req.user)
app.use(authMiddleware);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/apps', require('./routes/apps'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/uploads', require('./routes/uploads'));

// Health check — reports database state so deploy issues are diagnosable
app.get('/api/health', async (req, res) => {
  try { await ensureDb(); } catch { /* reported below */ }
  const db = dbState();
  res.status(db === 'connected' ? 200 : 503).json({ status: db === 'connected' ? 'ok' : 'degraded', db, timestamp: new Date().toISOString() });
});

// Desktop app installer download — proxied so users never see the source URL
const DESKTOP_INSTALLER_URL =
  process.env.DESKTOP_INSTALLER_URL ||
  'https://github.com/Jothankato05/primers-store/releases/latest/download/Primers.Store.Setup.1.0.0.exe';

app.get('/api/download/desktop', (req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="Primers-Store-Setup.exe"');
  res.redirect(302, DESKTOP_INSTALLER_URL);
});

// Serve React client in production (if built)
const distPath = path.join(__dirname, '..', 'client', 'dist');
if (process.env.NODE_ENV === 'production' && fs.existsSync(path.join(distPath, 'index.html'))) {
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  if (err.name === 'CastError') return res.status(404).json({ error: 'Not found' });
  if (err.code === 11000) return res.status(409).json({ error: 'Already exists' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'File too large' });
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'File too large. Maximum size is 500MB' });
  if (err.code === 'LIMIT_UNEXPECTED_FILE') return res.status(400).json({ error: 'Unexpected file field' });
  if (err.message && err.message.includes('Only image files')) return res.status(400).json({ error: err.message });
  if (err.message && err.message.startsWith('CORS:')) return res.status(403).json({ error: 'Origin not allowed' });

  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
module.exports.ensureDb = ensureDb;
