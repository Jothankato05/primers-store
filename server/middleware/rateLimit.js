// Minimal in-memory sliding-window rate limiter (per-IP). Suitable for a single
// server instance; swap for a shared store if the API ever runs multiple replicas.
function rateLimit({ windowMs, max, message }) {
  const hits = new Map();

  setInterval(() => {
    const now = Date.now();
    for (const [key, rec] of hits) {
      if (now >= rec.resetAt) hits.delete(key);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = req.ip || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    let rec = hits.get(key);
    if (!rec || now >= rec.resetAt) {
      rec = { count: 0, resetAt: now + windowMs };
      hits.set(key, rec);
    }
    rec.count++;
    if (rec.count > max) {
      res.setHeader('Retry-After', Math.ceil((rec.resetAt - now) / 1000));
      return res.status(429).json({ error: message || 'Too many requests. Please try again later.' });
    }
    next();
  };
}

module.exports = { rateLimit };
