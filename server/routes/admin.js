const express = require('express');
const router = express.Router();
const { getDb } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

// GET /admin/dashboard
router.get('/dashboard', (req, res) => {
  const db = getDb();
  const stats = {
    total_users: db.prepare('SELECT COUNT(*) as count FROM users').get().count,
    total_apps: db.prepare('SELECT COUNT(*) as count FROM apps').get().count,
    pending_apps: db.prepare("SELECT COUNT(*) as count FROM apps WHERE status = 'pending'").get().count,
    approved_apps: db.prepare("SELECT COUNT(*) as count FROM apps WHERE status = 'approved'").get().count,
    total_downloads: db.prepare('SELECT COALESCE(SUM(downloads_count), 0) as count FROM apps').get().count,
    total_reviews: db.prepare('SELECT COUNT(*) as count FROM reviews').get().count,
    pending_developers: db.prepare("SELECT COUNT(*) as count FROM developer_applications WHERE status = 'pending'").get().count,
    pending_versions: db.prepare("SELECT COUNT(*) as count FROM app_versions WHERE status = 'pending'").get().count,
  };
  res.json({ stats });
});

// GET /admin/users
router.get('/users', (req, res) => {
  const { search, role, limit = 50, offset = 0 } = req.query;
  const db = getDb();

  let query = 'SELECT id, username, email, display_name, role, email_verified, created_at FROM users WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (username LIKE ? OR email LIKE ? OR display_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role) {
    query += ' AND role = ?';
    params.push(role);
  }

  const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const { total } = db.prepare(countQuery).get(...params);

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const users = db.prepare(query).all(...params);
  res.json({ users, total });
});

// PATCH /admin/users/:id/role
router.patch('/users/:id/role', (req, res) => {
  const { role } = req.body;
  if (!['user', 'developer', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  const db = getDb();
  const result = db.prepare('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?').run(role, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: `User role updated to ${role}` });
});

// PATCH /admin/users/:id/verify
router.patch('/users/:id/verify', (req, res) => {
  const db = getDb();
  const result = db.prepare('UPDATE users SET email_verified = 1, verification_token = NULL, updated_at = datetime("now") WHERE id = ?').run(req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ message: 'Email verified' });
});

// GET /admin/apps
router.get('/apps', (req, res) => {
  const { status, search, category, limit = 50, offset = 0 } = req.query;
  const db = getDb();

  let query = `SELECT a.*, u.username as developer_name, u.email as developer_email
               FROM apps a JOIN users u ON a.developer_id = u.id WHERE 1=1`;
  const params = [];

  if (status) { query += ' AND a.status = ?'; params.push(status); }
  if (search) { query += ' AND (a.name LIKE ? OR a.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (category) { query += ' AND a.category = ?'; params.push(category); }

  const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const { total } = db.prepare(countQuery).get(...params);

  query += ' ORDER BY a.updated_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const apps = db.prepare(query).all(...params);
  res.json({ apps, total });
});

// GET /admin/apps/:id
router.get('/apps/:id', (req, res) => {
  const db = getDb();

  const app = db.prepare(`
    SELECT a.*, u.username as developer_name, u.email as developer_email, u.display_name as developer_display
    FROM apps a JOIN users u ON a.developer_id = u.id WHERE a.id = ?
  `).get(req.params.id);

  if (!app) return res.status(404).json({ error: 'App not found' });

  app.screenshots = db.prepare('SELECT * FROM app_screenshots WHERE app_id = ? ORDER BY sort_order').all(app.id);
  app.versions = db.prepare('SELECT * FROM app_versions WHERE app_id = ? ORDER BY created_at DESC').all(app.id);
  app.reviews = db.prepare(
    'SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.app_id = ? ORDER BY r.created_at DESC'
  ).all(app.id);

  res.json({ app });
});

// PATCH /admin/apps/:id/review
router.patch('/apps/:id/review', (req, res) => {
  const { status, review_notes } = req.body;
  if (!['approved', 'rejected', 'reviewing', 'suspended'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const db = getDb();
  const app = db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const updates = ["status = ?", "review_notes = ?", "updated_at = datetime('now')"];
  const params = [status, review_notes || null];

  if (status === 'approved') {
    updates.push("published_at = COALESCE(published_at, datetime('now'))");
  }

  params.push(req.params.id);
  db.prepare(`UPDATE apps SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  res.json({ message: `App ${status}`, app: db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id) });
});

// PATCH /admin/apps/:id/versions/:versionId/url - Update download URL (for external/large files)
router.patch('/apps/:id/versions/:versionId/url', (req, res) => {
  const { file_url, file_size } = req.body;
  if (!file_url) return res.status(400).json({ error: 'file_url is required' });

  const db = getDb();
  const version = db.prepare('SELECT * FROM app_versions WHERE id = ? AND app_id = ?').get(req.params.versionId, req.params.id);
  if (!version) return res.status(404).json({ error: 'Version not found' });

  db.prepare('UPDATE app_versions SET file_url = ?, file_size = COALESCE(?, file_size) WHERE id = ?')
    .run(file_url, file_size ? Number(file_size) : null, req.params.versionId);

  res.json({ message: 'Download URL updated', version: db.prepare('SELECT * FROM app_versions WHERE id = ?').get(req.params.versionId) });
});

// PATCH /admin/apps/:id/versions/:versionId/review
router.patch('/apps/:id/versions/:versionId/review', (req, res) => {
  const { status, review_notes } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const db = getDb();
  const result = db.prepare(
    'UPDATE app_versions SET status = ? WHERE id = ? AND app_id = ?'
  ).run(status, req.params.versionId, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Version not found' });
  res.json({ message: `Version ${status}` });
});

// DELETE /admin/apps/:id
router.delete('/apps/:id', (req, res) => {
  const db = getDb();
  const result = db.prepare("UPDATE apps SET status = 'removed', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'App not found' });
  res.json({ message: 'App removed' });
});

// GET /admin/developer-applications
router.get('/developer-applications', (req, res) => {
  const { status } = req.query;
  const db = getDb();

  let query = `SELECT da.*, u.username, u.email
               FROM developer_applications da JOIN users u ON da.user_id = u.id WHERE 1=1`;
  const params = [];

  if (status) { query += ' AND da.status = ?'; params.push(status); }

  query += ' ORDER BY da.created_at DESC';
  const applications = db.prepare(query).all(...params);
  res.json({ applications });
});

// PATCH /admin/developer-applications/:id/review
router.patch('/developer-applications/:id/review', (req, res) => {
  const { status, review_notes } = req.body;
  if (!['approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const db = getDb();
  const app = db.prepare('SELECT * FROM developer_applications WHERE id = ?').get(req.params.id);
  if (!app) return res.status(404).json({ error: 'Application not found' });

  db.prepare(
    "UPDATE developer_applications SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = datetime('now') WHERE id = ?"
  ).run(status, req.user.id, review_notes || null, req.params.id);

  if (status === 'approved') {
    db.prepare("UPDATE users SET role = 'developer', updated_at = datetime('now') WHERE id = ?").run(app.user_id);
  }

  res.json({ message: `Developer application ${status}` });
});

// GET /admin/reviews
router.get('/reviews', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  const db = getDb();

  const reviews = db.prepare(
    `SELECT r.*, u.username, a.name as app_name, a.slug as app_slug
     FROM reviews r JOIN users u ON r.user_id = u.id JOIN apps a ON r.app_id = a.id
     ORDER BY r.created_at DESC LIMIT ? OFFSET ?`
  ).all(Number(limit), Number(offset));

  const { total } = db.prepare('SELECT COUNT(*) as total FROM reviews').get();
  res.json({ reviews, total });
});

// DELETE /admin/reviews/:id
router.delete('/reviews/:id', (req, res) => {
  const db = getDb();
  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(req.params.id);
  if (!review) return res.status(404).json({ error: 'Review not found' });

  db.prepare('DELETE FROM reviews WHERE id = ?').run(req.params.id);

  const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE app_id = ?').get(review.app_id);
  db.prepare('UPDATE apps SET rating_avg = COALESCE(?, 0), rating_count = ? WHERE id = ?').run(
    stats.avg ? Math.round(stats.avg * 10) / 10 : 0, stats.count, review.app_id
  );

  res.json({ message: 'Review deleted' });
});

module.exports = router;
