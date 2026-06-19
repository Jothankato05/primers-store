const { getDb, verifyPassword } = require('../database');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'primers-store-secret-key-change-in-production';
if (!process.env.JWT_SECRET) console.warn('⚠️  JWT_SECRET not set — using insecure default. Set JWT_SECRET in production.');
const JWT_EXPIRY = '7d';

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const session = db.prepare(
      'SELECT s.*, u.id as uid, u.username, u.email, u.display_name, u.role, u.email_verified FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime("now")'
    ).get(token);

    if (!session) {
      req.user = null;
      return next();
    }

    req.user = {
      id: session.uid,
      username: session.username,
      email: session.email,
      display_name: session.display_name,
      role: session.role,
      email_verified: session.email_verified,
    };
    req.sessionToken = token;
  } catch {
    req.user = null;
  }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function requireDeveloper(req, res, next) {
  if (!req.user || (req.user.role !== 'developer' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Developer access required' });
  }
  next();
}

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

module.exports = { authMiddleware, requireAuth, requireAdmin, requireDeveloper, signToken, JWT_SECRET, JWT_EXPIRY };
