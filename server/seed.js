const { getDb, hashPassword } = require('./database');

const db = getDb();

// Create admin account if not exists
const existingAdmin = db.prepare("SELECT id FROM users WHERE email = 'admin@primers.store'").get();
if (!existingAdmin) {
  const password_hash = hashPassword('admin123');
  db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, role, email_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('admin', 'admin@primers.store', password_hash, 'Primers Admin', 'admin', 1);
  console.log('✅ Admin account created: admin@primers.store / admin123');
}

// Create demo developer
const existingDev = db.prepare("SELECT id FROM users WHERE email = 'dev@primers.store'").get();
if (!existingDev) {
  const password_hash = hashPassword('dev123456');
  db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, role, email_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('demo-dev', 'dev@primers.store', password_hash, 'Primers Group', 'developer', 1);
  console.log('✅ Developer account created: dev@primers.store / dev123456');
}

// Create demo user
const existingUser = db.prepare("SELECT id FROM users WHERE email = 'user@primers.store'").get();
if (!existingUser) {
  const password_hash = hashPassword('user123456');
  db.prepare(`
    INSERT INTO users (username, email, password_hash, display_name, role, email_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('demo-user', 'user@primers.store', password_hash, 'Demo User', 'user', 1);
  console.log('✅ User account created: user@primers.store / user123456');
}

// Seed Presona app if apps table is empty
const appCount = db.prepare("SELECT COUNT(*) as count FROM apps").get().count;
if (appCount === 0) {
  const devId = db.prepare("SELECT id FROM users WHERE email = 'dev@primers.store'").get()?.id;
  if (devId) {
    db.prepare(`
      INSERT INTO apps (developer_id, name, slug, description, short_description, category, website, status, published_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', datetime('now'))
    `).run(
      devId,
      'Presona',
      'presona',
      'Presona is a fully offline AI agent that knows your work, not just your files. It tracks your projects, detects what\'s active, blocked, or going stale, cleans up your storage, and delivers a daily narrative of everything you\'re working on — all powered by PrimersGPT running entirely on your machine.\n\n**Features:**\n• Project tracking with active/blocked/stale detection\n• Daily work narrative generation\n• Storage cleanup and duplicate detection\n• System tray operation (stays alive when window closed)\n• Desktop notifications for blocked/stale projects\n• Zero cloud, zero login, zero subscription\n\n**Powered by PrimersGPT** — built on phi4-mini and nomic-embed-text through a fully hidden Ollama layer. The user never sees Ollama. They only ever see PrimersGPT.\n\nYour data never leaves your machine. No cloud. No subscription. No account.',
      'Your personal AI agent. Fully offline. Knows your work. Powered by PrimersGPT.',
      'Productivity',
      'https://github.com/Jothankato05/primers-store/releases/tag/v1.0.0'
    );
    console.log('✅ Presona app seeded');

    // Seed Presona version with Internet Archive download URL
    db.prepare(`
      INSERT INTO app_versions (app_id, version, changelog, file_url, file_size, platform, status)
      VALUES (?, ?, ?, ?, ?, ?, 'approved')
    `).run(1, '1.0.0', 'Initial release — the first app on Primers Store.', 'https://archive.org/download/presona-installer/Presona-Installer.exe', 1640000000, 'windows');
    console.log('✅ Presona v1.0.0 version seeded');
  }
}

console.log('🌱 Seed complete!');
process.exit(0);
