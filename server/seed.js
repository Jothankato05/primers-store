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
  `).run('demo-dev', 'dev@primers.store', password_hash, 'Demo Developer', 'developer', 1);
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

// Seed categories if apps table is empty
const appCount = db.prepare("SELECT COUNT(*) as count FROM apps").get().count;
if (appCount === 0) {
  console.log('📦 No apps found. Add apps through the store UI!');
}

console.log('🌱 Seed complete!');
process.exit(0);
