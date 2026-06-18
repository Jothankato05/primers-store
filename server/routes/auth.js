const express = require('express');
const router = express.Router();
const { getDb, generateToken, hashPassword, verifyPassword } = require('../database');
const { signToken, requireAuth } = require('../middleware/auth');

// Register
router.post('/register', (req, res) => {
  const { username, email, password, display_name } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }

  if (username.length < 3 || username.length > 30) {
    return res.status(400).json({ error: 'Username must be 3-30 characters' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const db = getDb();

  const existing = db.prepare('SELECT id FROM users WHERE username = ? OR email = ?').get(username, email);
  if (existing) {
    return res.status(409).json({ error: 'Username or email already exists' });
  }

  const password_hash = hashPassword(password);
  const verification_token = generateToken(32);

  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash, display_name, verification_token) VALUES (?, ?, ?, ?, ?)'
  ).run(username, email.toLowerCase(), password_hash, display_name || username, verification_token);

  const token = signToken(result.lastInsertRowid);
  db.prepare(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))"
  ).run(result.lastInsertRowid, token);

  res.status(201).json({
    message: 'Registration successful',
    user: {
      id: result.lastInsertRowid,
      username,
      email: email.toLowerCase(),
      display_name: display_name || username,
      role: 'user',
      email_verified: false,
    },
    token,
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = signToken(user.id);
  db.prepare(
    "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, datetime('now', '+7 days'))"
  ).run(user.id, token);

  res.json({
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.display_name,
      role: user.role,
      email_verified: !!user.email_verified,
      avatar_url: user.avatar_url,
      bio: user.bio,
    },
    token,
  });
});

// Logout
router.post('/logout', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM sessions WHERE token = ?').run(req.sessionToken);
  res.json({ message: 'Logged out successfully' });
});

// Get current user
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, username, email, display_name, role, email_verified, avatar_url, bio, created_at FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json({ user: { ...user, email_verified: !!user.email_verified } });
});

// Update profile
router.patch('/profile', requireAuth, (req, res) => {
  const { display_name, bio, avatar_url } = req.body;
  const db = getDb();

  const updates = [];
  const params = [];

  if (display_name !== undefined) { updates.push('display_name = ?'); params.push(display_name); }
  if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
  if (avatar_url !== undefined) { updates.push('avatar_url = ?'); params.push(avatar_url); }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  updates.push("updated_at = datetime('now')");
  params.push(req.user.id);

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const user = db.prepare(
    'SELECT id, username, email, display_name, role, email_verified, avatar_url, bio FROM users WHERE id = ?'
  ).get(req.user.id);

  res.json({ user: { ...user, email_verified: !!user.email_verified } });
});

// Request developer role
router.post('/apply-developer', requireAuth, (req, res) => {
  const { company_name, reason } = req.body;
  const db = getDb();

  if (!reason || reason.length < 20) {
    return res.status(400).json({ error: 'Please provide a reason (minimum 20 characters)' });
  }

  const existing = db.prepare(
    "SELECT id FROM developer_applications WHERE user_id = ? AND status = 'pending'"
  ).get(req.user.id);

  if (existing) {
    return res.status(409).json({ error: 'You already have a pending developer application' });
  }

  if (req.user.role === 'developer' || req.user.role === 'admin') {
    return res.status(400).json({ error: 'You are already a developer' });
  }

  db.prepare(
    'INSERT INTO developer_applications (user_id, company_name, reason) VALUES (?, ?, ?)'
  ).run(req.user.id, company_name || null, reason);

  res.status(201).json({ message: 'Developer application submitted for review' });
});

module.exports = router;
