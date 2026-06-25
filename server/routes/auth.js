const express = require('express');
const router = express.Router();
const { generateToken, hashPassword, verifyPassword, User, Session } = require('../database');
const { signToken, requireAuth } = require('../middleware/auth');

const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now >= rec.resetAt) return false;
  return rec.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip);
  if (!rec || now >= rec.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  } else {
    rec.count++;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, rec] of loginAttempts) {
    if (now >= rec.resetAt) loginAttempts.delete(ip);
  }
}, LOGIN_WINDOW_MS);

const { DeveloperApplication } = require('../database');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
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
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const existing = await User.findOne({ $or: [{ username }, { email: email.toLowerCase() }] });
    if (existing) return res.status(409).json({ error: 'Username or email already exists' });

    const user = await User.create({
      username,
      email: email.toLowerCase(),
      password_hash: hashPassword(password),
      display_name: display_name || username,
      verification_token: generateToken(32),
    });

    const token = signToken(user._id.toString());
    await Session.create({
      user_id: user._id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        email_verified: user.email_verified,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many login attempts. Please try again in 15 minutes.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !verifyPassword(password, user.password_hash)) {
      recordFailedLogin(ip);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    loginAttempts.delete(ip);
    const token = signToken(user._id.toString());
    await Session.create({
      user_id: user._id,
      token,
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.json({
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
        display_name: user.display_name,
        role: user.role,
        email_verified: user.email_verified,
        avatar_url: user.avatar_url,
        bio: user.bio,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    await Session.deleteOne({ token: req.sessionToken });
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id, 'username email display_name role email_verified avatar_url bio created_at');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/profile
router.patch('/profile', requireAuth, async (req, res, next) => {
  try {
    const { display_name, bio, avatar_url } = req.body;
    const updates = {};
    if (display_name !== undefined) updates.display_name = display_name;
    if (bio !== undefined) updates.bio = bio;
    if (avatar_url !== undefined) updates.avatar_url = avatar_url;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, select: 'username email display_name role email_verified avatar_url bio' }
    );

    res.json({ user: user.toJSON() });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/apply-developer
router.post('/apply-developer', requireAuth, async (req, res, next) => {
  try {
    const { company_name, reason } = req.body;

    if (!reason || reason.length < 20) {
      return res.status(400).json({ error: 'Please provide a reason (minimum 20 characters)' });
    }
    if (req.user.role === 'developer' || req.user.role === 'admin') {
      return res.status(400).json({ error: 'You are already a developer' });
    }

    const existing = await DeveloperApplication.findOne({ user_id: req.user.id, status: 'pending' });
    if (existing) return res.status(409).json({ error: 'You already have a pending developer application' });

    await DeveloperApplication.create({
      user_id: req.user.id,
      company_name: company_name || null,
      reason,
    });

    res.status(201).json({ message: 'Developer application submitted for review' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
