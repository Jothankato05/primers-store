const express = require('express');
const router = express.Router();
const { requireAuth, requireDeveloper } = require('../middleware/auth');
const { createUploadToken, UploadError } = require('../storage');
const { rateLimit } = require('../middleware/rateLimit');

const tokenLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 120, message: 'Too many uploads. Please wait a few minutes and try again.' });

// POST /api/uploads/token — { kind, filename, size, contentType } → { token, pathname }
// The browser then uploads the file straight to storage with this token.
router.post('/token', tokenLimiter, requireAuth, requireDeveloper, async (req, res, next) => {
  try {
    const { kind, filename, size, contentType } = req.body || {};
    const result = await createUploadToken({ userId: req.user.id, kind, filename, size, contentType });
    res.json(result);
  } catch (err) {
    if (err instanceof UploadError) return res.status(err.status).json({ error: err.message });
    next(err);
  }
});

module.exports = router;
