const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { authMiddleware } = require('./middleware/auth');
const { getDb, hashPassword } = require('./database');

const app = express();
const PORT = process.env.PORT || 3001;

// Auto-seed demo accounts on first run
function autoSeed() {
  const db = getDb();
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount === 0) {
    console.log('🌱 First run — seeding demo accounts...');
    const password_hash = hashPassword('admin123');
    db.prepare(`INSERT INTO users (username, email, password_hash, display_name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)`).run('admin', 'admin@primers.store', password_hash, 'Primers Admin', 'admin', 1);
    const dev_hash = hashPassword('dev123456');
    db.prepare(`INSERT INTO users (username, email, password_hash, display_name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)`).run('demo-dev', 'dev@primers.store', dev_hash, 'Demo Developer', 'developer', 1);
    const user_hash = hashPassword('user123456');
    db.prepare(`INSERT INTO users (username, email, password_hash, display_name, role, email_verified) VALUES (?, ?, ?, ?, ?, ?)`).run('demo-user', 'user@primers.store', user_hash, 'Demo User', 'user', 1);
    console.log('✅ Demo accounts created');
  }
  // Seed Presona app
  const appCount = db.prepare('SELECT COUNT(*) as count FROM apps').get().count;
  if (appCount === 0) {
    console.log('📦 Seeding Presona...');
    const devId = db.prepare("SELECT id FROM users WHERE email = 'dev@primers.store'").get().id;
    db.prepare(`INSERT INTO apps (developer_id, name, slug, description, short_description, category, website, status, published_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'))`).run(
      devId, 'Presona', 'presona',
      'Presona is a fully offline AI agent that knows your work, not just your files. It tracks your projects, detects what\'s active, blocked, or going stale, cleans up your storage, and delivers a daily narrative of everything you\'re working on — all powered by PrimersGPT running entirely on your machine.\n\nFeatures:\n• Project tracking with active/blocked/stale detection\n• Daily work narrative generation\n• Storage cleanup and duplicate detection\n• System tray operation (stays alive when window closed)\n• Desktop notifications\n• Zero cloud, zero login, zero subscription\n\nPowered by PrimersGPT — built on phi4-mini and nomic-embed-text through a fully hidden Ollama layer.',
      'Your personal AI agent. Fully offline. Knows your work. Powered by PrimersGPT.', 'Productivity',
      'https://github.com/Jothankato05/primers-store/releases/tag/v1.0.0'
    );
    db.prepare(`INSERT INTO app_versions (app_id, version, changelog, file_url, file_size, platform, status) VALUES (?, ?, ?, ?, ?, ?, 'approved')`).run(
      1, '1.0.0', 'Initial release — the first app on Primers Store.',
      'https://github.com/Jothankato05/primers-store/releases/download/v1.0.0/Presona-Installer.exe', 1640000000, 'windows'
    );
    console.log('✅ Presona seeded');
  }
}
autoSeed();

// Middleware
app.use(cors());
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  console.error(err.stack);

  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'File too large' });
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Maximum size is 500MB' });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }
  if (err.message && err.message.includes('Only image files')) {
    return res.status(400).json({ error: err.message });
  }

  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Primers Store server running on http://localhost:${PORT}`);
  console.log(`📦 API: http://localhost:${PORT}/api`);
  console.log(`🏪 Store: http://localhost:${PORT}`);
});
