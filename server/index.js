const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const { connectDb, dbState, hashPassword, User, App, AppVersion, Session } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Railway/Vercel sit in front of the API — trust X-Forwarded-For so req.ip is the
// real client, not the proxy (otherwise every user shares one rate-limit bucket).
app.set('trust proxy', true);

const ALLOWED_ORIGINS = [
  'https://primers-store-ruddy.vercel.app',
  'https://primers-store-liard.vercel.app',
  'http://localhost:5173',
  'http://localhost:3001',
];

async function autoSeed() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    console.log('🌱 First run — seeding demo accounts...');
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    if (!process.env.ADMIN_PASSWORD) {
      console.warn('⚠️  Seeding admin with the default password. Set ADMIN_PASSWORD, or change it after first login.');
    }
    await User.create({ username: 'admin', email: process.env.ADMIN_EMAIL || 'admin@primers.store', password_hash: hashPassword(adminPassword), display_name: 'Primers Admin', role: 'admin', email_verified: true });
    await User.create({ username: 'demo-dev', email: 'dev@primers.store', password_hash: hashPassword('dev123456'), display_name: 'Primers Group', role: 'developer', email_verified: true });
    await User.create({ username: 'demo-user', email: 'user@primers.store', password_hash: hashPassword('user123456'), display_name: 'Demo User', role: 'user', email_verified: true });
    console.log('✅ Demo accounts created');
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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Auth middleware (sets req.user)
app.use(authMiddleware);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/apps', require('./routes/apps'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/ai', require('./routes/ai'));

// Health check — reports database state so deploy issues are diagnosable
app.get('/api/health', (req, res) => {
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

// Listen immediately so the platform health check sees the process, then connect
// to Mongo with retries — a bad/slow MONGODB_URI must not turn into a crash loop.
app.listen(PORT, () => {
  console.log(`🚀 Primers Store server running on http://localhost:${PORT}`);
  console.log(`📦 API: http://localhost:${PORT}/api`);
  console.log(`🏪 Store: http://localhost:${PORT}`);
});

async function startDb(attempt = 1) {
  try {
    await connectDb();
    await autoSeed();
    await cleanupSessions();
    setInterval(cleanupSessions, 60 * 60 * 1000).unref(); // hourly
  } catch (err) {
    const delay = Math.min(30000, 2000 * attempt);
    console.error(`❌ MongoDB connect failed (attempt ${attempt}): ${err.message} — retrying in ${delay / 1000}s`);
    setTimeout(() => startDb(attempt + 1), delay).unref();
  }
}
startDb();
