// Manual seed script — the server also auto-seeds on first run (see index.js).
// Usage: MONGODB_URI=... node server/seed.js
const { connectDb, hashPassword, User } = require('./database');

async function seed() {
  await connectDb();

  const accounts = [
    { username: 'admin', email: 'admin@primers.store', password: process.env.ADMIN_PASSWORD || 'admin123', display_name: 'Primers Admin', role: 'admin' },
    { username: 'demo-dev', email: 'dev@primers.store', password: 'dev123456', display_name: 'Primers Group', role: 'developer' },
    { username: 'demo-user', email: 'user@primers.store', password: 'user123456', display_name: 'Demo User', role: 'user' },
  ];

  for (const acc of accounts) {
    const existing = await User.findOne({ email: acc.email });
    if (existing) {
      console.log(`ℹ️  ${acc.email} already exists`);
      continue;
    }
    await User.create({
      username: acc.username,
      email: acc.email,
      password_hash: hashPassword(acc.password),
      display_name: acc.display_name,
      role: acc.role,
      email_verified: true,
    });
    console.log(`✅ ${acc.role} account created: ${acc.email}`);
  }

  console.log('🌱 Seed complete!');
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
