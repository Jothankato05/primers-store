const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const { connectDb, dbState, hashPassword, verifyPassword, User, App, AppVersion, Session } = require('./database');

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

// Keep first-party app branding current (idempotent, one cheap query per instance).
const PRESONA_ICON = `${process.env.STORE_URL || 'https://store.primersgroup.ng'}/brand/presona-icon.png`;
// Any account still on a publicly known demo password gets a random one and is signed out
// everywhere. Runs once per instance; a no-op once the passwords have changed.
const PUBLIC_DEMO_PASSWORDS = { 'admin@primers.store': ['admin123'], 'dev@primers.store': ['dev123456'], 'user@primers.store': ['user123456'] };
async function retirePublicPasswords() {
  if (process.env.NODE_ENV !== 'production') return;
  for (const [email, known] of Object.entries(PUBLIC_DEMO_PASSWORDS)) {
    try {
      const u = await User.findOne({ email });
      if (!u || !known.some(pw => verifyPassword(pw, u.password_hash))) continue;
      await User.updateOne({ _id: u._id }, { $set: { password_hash: hashPassword(crypto.randomBytes(32).toString('base64url')) } });
      await Session.deleteMany({ user_id: u._id });
      console.log(`🔒 Retired the public demo password on ${email}`);
    } catch (e) {
      console.error('Demo password check failed:', e.message);
    }
  }
}

async function brandFixes() {
  await retirePublicPasswords();
  try {
    await App.updateOne({ slug: 'presona', icon_url: { $ne: PRESONA_ICON } }, { $set: { icon_url: PRESONA_ICON } });
  } catch (e) {
    console.error('Brand update skipped:', e.message);
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
    if (!origin || origin === 'null' || /^primers:\/\//.test(origin)) return cb(null, true);
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

// Serverless-friendly database start: connect once per instance, seed once, and clean up
// expired sessions at most hourly. A failed connect is retried on the next request.
let ready = null;
let lastCleanup = 0;
function ensureDb() {
  if (!ready) {
    ready = (async () => { await connectDb(); await autoSeed(); await brandFixes(); })().catch(err => { ready = null; throw err; });
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

// Desktop app installer download. Looks up the newest GitHub release that carries a Windows
// installer, so a new release goes live without a redeploy. With none published yet it sends
// people to the store's desktop page instead of a GitHub 404.
const DESKTOP_REPO = process.env.DESKTOP_REPO || 'Jothankato05/primers-store';
const STORE_URL = process.env.STORE_URL || 'https://store.primersgroup.ng';
let installerCache = { url: null, at: 0 };

async function latestInstallerUrl() {
  if (process.env.DESKTOP_INSTALLER_URL) return process.env.DESKTOP_INSTALLER_URL;
  if (Date.now() - installerCache.at < 10 * 60 * 1000) return installerCache.url;
  let url = null;
  try {
    const r = await fetch(`https://api.github.com/repos/${DESKTOP_REPO}/releases?per_page=10`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'primers-store' },
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) {
      const releases = await r.json();
      for (const rel of releases) {
        if (rel.draft || rel.prerelease) continue;
        const exe = (rel.assets || []).find(a => /\.exe$/i.test(a.name));
        if (exe) { url = exe.browser_download_url; break; }
      }
    }
  } catch (err) {
    console.error('Desktop release lookup failed:', err.message);
    if (installerCache.url) return installerCache.url; // keep serving the last good link
  }
  installerCache = { url, at: Date.now() };
  return url;
}

app.get('/api/download/desktop', async (req, res) => {
  const url = await latestInstallerUrl();
  res.setHeader('Cache-Control', 'no-store');
  res.redirect(302, url || `${STORE_URL}/desktop`);
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
