const { Session } = require('../database');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || 'primers-store-secret-key-change-in-production';
if (!process.env.JWT_SECRET) console.warn('⚠️  JWT_SECRET not set — using insecure default. Set JWT_SECRET in production.');
const JWT_EXPIRY = '7d';

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(' ')[1];

  // A bad/expired token means "anonymous", but a database failure must surface
  // as a 5xx — otherwise a transient outage would masquerade as a logout.
  try {
    jwt.verify(token, JWT_SECRET);
  } catch {
    req.user = null;
    return next();
  }

  try {
    const session = await Session.findOne({ token, expires_at: { $gt: new Date() } }).populate('user_id');

    if (!session || !session.user_id) {
      req.user = null;
      return next();
    }

    const u = session.user_id;
    req.user = {
      id: u._id.toString(),
      username: u.username,
      email: u.email,
      display_name: u.display_name,
      role: u.role,
      email_verified: u.email_verified,
    };
    req.sessionToken = token;
    next();
  } catch (err) {
    next(err);
  }
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function requireDeveloper(req, res, next) {
  if (!req.user || (req.user.role !== 'developer' && req.user.role !== 'admin')) {
    return res.status(403).json({ error: 'Developer access required' });
  }
  next();
}

function signToken(userId) {
  // jti makes every token unique — two logins in the same second would otherwise
  // produce identical JWTs and collide with the sessions.token unique index
  return jwt.sign({ userId, jti: crypto.randomBytes(8).toString('hex') }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

module.exports = { authMiddleware, requireAuth, requireAdmin, requireDeveloper, signToken, JWT_SECRET, JWT_EXPIRY };
