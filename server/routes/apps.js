const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const { getDb } = require('../database');
const { requireAuth, requireDeveloper } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const subDir = file.fieldname === 'icon' ? 'icons' :
                   file.fieldname === 'banner' ? 'banners' :
                   file.fieldname === 'screenshots' ? 'screenshots' :
                   file.fieldname === 'app_file' ? 'app-files' : 'misc';
    const dir = path.join(UPLOADS_DIR, subDir);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max for app files
  fileFilter: (req, file, cb) => {
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (file.fieldname === 'app_file') {
      return cb(null, true);
    }
    if (['icon', 'banner', 'screenshots'].includes(file.fieldname)) {
      if (allowedImages.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  }
});

// Slugify — normalize Unicode, strip diacritics, fall back to timestamp for all-non-ASCII names
function slugify(text) {
  const slug = text.toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `app-${Date.now()}`;
}

// Validate that a URL uses http or https (blocks file://, javascript:, etc.)
function isValidHttpUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

// Delete a local upload file if it's under /uploads/ — path traversal safe
function deleteUploadFile(urlPath) {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return;
  const filePath = path.resolve(UPLOADS_DIR, urlPath.replace(/^\/uploads\//, ''));
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return;
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

// Stream-based SHA256 — avoids loading large files into memory
function streamHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// GET /apps - Public store listing
router.get('/', (req, res) => {
  const db = getDb();
  const { category, search, sort, limit = 20, offset = 0, developer_id } = req.query;
  if (search && search.length > 200) return res.status(400).json({ error: 'Search query too long' });

  let query = `SELECT a.*, u.username as developer_name FROM apps a JOIN users u ON a.developer_id = u.id WHERE a.status = 'approved'`;
  const params = [];

  if (category) {
    query += ' AND a.category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (a.name LIKE ? OR a.description LIKE ? OR a.short_description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (developer_id) {
    query += ' AND a.developer_id = ?';
    params.push(developer_id);
  }

  const countQuery = query.replace(/SELECT.*?FROM/, 'SELECT COUNT(*) as total FROM');
  const { total } = db.prepare(countQuery).get(...params);

  switch (sort) {
    case 'newest': query += ' ORDER BY a.published_at DESC'; break;
    case 'oldest': query += ' ORDER BY a.published_at ASC'; break;
    case 'rating': query += ' ORDER BY a.rating_avg DESC'; break;
    case 'downloads': query += ' ORDER BY a.downloads_count DESC'; break;
    case 'name': query += ' ORDER BY a.name ASC'; break;
    default: query += ' ORDER BY a.downloads_count DESC';
  }

  query += ' LIMIT ? OFFSET ?';
  params.push(Number(limit), Number(offset));

  const apps = db.prepare(query).all(...params);
  res.json({ apps, total, limit: Number(limit), offset: Number(offset) });
});

// GET /apps/categories - List categories
router.get('/categories', (req, res) => {
  const db = getDb();
  const categories = db.prepare(
    "SELECT category, COUNT(*) as count FROM apps WHERE status = 'approved' GROUP BY category ORDER BY category"
  ).all();
  res.json({ categories });
});

// GET /apps/:slug - Single app detail
router.get('/:slug', (req, res) => {
  const db = getDb();
  const app = db.prepare(`
    SELECT a.*, u.username as developer_name, u.display_name as developer_display
    FROM apps a JOIN users u ON a.developer_id = u.id
    WHERE a.slug = ? AND a.status = 'approved'
  `).get(req.params.slug);

  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }

  // Override Presona display info
  if (req.params.slug === 'presona') {
    app.developer_display = 'Primers Group';
    app.short_description = 'Your personal AI agent. Fully offline. Knows your work. Powered by PrimersGPT.';
  }

  app.screenshots = db.prepare(
    'SELECT * FROM app_screenshots WHERE app_id = ? ORDER BY sort_order'
  ).all(app.id);

  // Include file_url so the download button works
  app.latest_version = db.prepare(
    "SELECT id, version, changelog, file_url, file_size, platform, min_os_version, downloads_count, created_at FROM app_versions WHERE app_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1"
  ).get(app.id);

  // Override Presona download URL to Internet Archive
  if (req.params.slug === 'presona' && app.latest_version) {
    app.latest_version.file_url = 'https://archive.org/download/presona-installer/Presona-Installer.exe';
  }

  // Check if user has installed this app
  if (req.user) {
    const installation = db.prepare(
      'SELECT id FROM app_installations WHERE user_id = ? AND app_id = ?'
    ).get(req.user.id, app.id);
    app.is_installed = !!installation;
  } else {
    app.is_installed = false;
  }

  const reviews = db.prepare(
    'SELECT r.*, u.username, u.avatar_url FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.app_id = ? ORDER BY r.created_at DESC LIMIT 10'
  ).all(app.id);

  res.json({ app: { ...app, reviews } });
});

// POST /apps - Create new app (developer only)
router.post('/', requireAuth, requireDeveloper, upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'screenshots', maxCount: 10 },
  { name: 'app_file', maxCount: 1 }
]), async (req, res) => {
  const { name, description, short_description, category, website, support_email, privacy_url, version, changelog, platform, min_os_version } = req.body;

  if (!name || !description || !category) {
    return res.status(400).json({ error: 'Name, description, and category are required' });
  }
  if (name.length < 2 || name.length > 200) {
    return res.status(400).json({ error: 'App name must be 2–200 characters' });
  }
  if (description.length > 50000) {
    return res.status(400).json({ error: 'Description must be under 50,000 characters' });
  }

  const { external_file_url, external_file_size } = req.body;
  if (external_file_url && !isValidHttpUrl(external_file_url)) {
    return res.status(400).json({ error: 'external_file_url must be a valid http or https URL' });
  }
  if (version && !/^[a-zA-Z0-9.\-_+]{1,50}$/.test(version)) {
    return res.status(400).json({ error: 'Version format is invalid' });
  }

  const db = getDb();
  const slug = slugify(name);
  const existingSlug = db.prepare('SELECT id FROM apps WHERE slug = ?').get(slug);
  const finalSlug = existingSlug ? `${slug}-${Date.now()}` : slug;

  const icon_url = req.files?.icon?.[0] ? `/uploads/icons/${req.files.icon[0].filename}` : null;
  const banner_url = req.files?.banner?.[0] ? `/uploads/banners/${req.files.banner[0].filename}` : null;

  const result = db.prepare(`
    INSERT INTO apps (developer_id, name, slug, description, short_description, category, icon_url, banner_url, website, support_email, privacy_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    req.user.id, name, finalSlug, description, short_description || (description || '').substring(0, 200),
    category, icon_url, banner_url, website || null, support_email || null, privacy_url || null
  );

  const appId = result.lastInsertRowid;

  if (req.files?.screenshots) {
    const insertScreenshot = db.prepare(
      'INSERT INTO app_screenshots (app_id, url, caption, sort_order) VALUES (?, ?, ?, ?)'
    );
    req.files.screenshots.forEach((file, i) => {
      insertScreenshot.run(appId, `/uploads/screenshots/${file.filename}`, null, i);
    });
  }

  if (version && (req.files?.app_file?.[0] || external_file_url)) {
    let fileUrl, fileSize, fileHash = null;
    if (req.files?.app_file?.[0]) {
      const file = req.files.app_file[0];
      fileUrl = `/uploads/app-files/${file.filename}`;
      fileSize = file.size;
      fileHash = await streamHash(file.path);
    } else {
      fileUrl = external_file_url;
      fileSize = external_file_size ? Number(external_file_size) : null;
    }

    db.prepare(`
      INSERT INTO app_versions (app_id, version, changelog, file_url, file_size, file_hash, platform, min_os_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(appId, version, changelog || 'Initial release', fileUrl, fileSize, fileHash, platform || 'windows', min_os_version || null);
  }

  res.status(201).json({
    message: 'App submitted for review',
    app: db.prepare('SELECT * FROM apps WHERE id = ?').get(appId),
  });
});

// PATCH /apps/:id - Update app (developer, own apps only)
router.patch('/:id', requireAuth, requireDeveloper, upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'screenshots', maxCount: 10 }
]), (req, res) => {
  const db = getDb();
  const app = db.prepare('SELECT * FROM apps WHERE id = ? AND developer_id = ?').get(req.params.id, req.user.id);

  if (!app) {
    return res.status(404).json({ error: 'App not found or access denied' });
  }

  const { name, description, short_description, category, website, support_email, privacy_url } = req.body;
  const updates = [];
  const params = [];

  if (name) {
    const newSlug = slugify(name);
    const slugConflict = db.prepare('SELECT id FROM apps WHERE slug = ? AND id != ?').get(newSlug, req.params.id);
    const finalSlug = slugConflict ? `${newSlug}-${Date.now()}` : newSlug;
    updates.push('name = ?'); params.push(name);
    updates.push('slug = ?'); params.push(finalSlug);
  }
  if (description) { updates.push('description = ?'); params.push(description); }
  if (short_description) { updates.push('short_description = ?'); params.push(short_description); }
  if (category) { updates.push('category = ?'); params.push(category); }
  if (website !== undefined) { updates.push('website = ?'); params.push(website); }
  if (support_email !== undefined) { updates.push('support_email = ?'); params.push(support_email); }
  if (privacy_url !== undefined) { updates.push('privacy_url = ?'); params.push(privacy_url); }

  if (req.files?.icon?.[0]) {
    deleteUploadFile(app.icon_url);
    updates.push('icon_url = ?'); params.push(`/uploads/icons/${req.files.icon[0].filename}`);
  }
  if (req.files?.banner?.[0]) {
    deleteUploadFile(app.banner_url);
    updates.push('banner_url = ?'); params.push(`/uploads/banners/${req.files.banner[0].filename}`);
  }

  if (updates.length > 0) {
    updates.push("status = 'pending'");
    updates.push("updated_at = datetime('now')");
    params.push(req.params.id);
    db.prepare(`UPDATE apps SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  if (req.files?.screenshots) {
    const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM app_screenshots WHERE app_id = ?').get(req.params.id);
    const startOrder = (maxOrder?.m || -1) + 1;
    const insertScreenshot = db.prepare(
      'INSERT INTO app_screenshots (app_id, url, caption, sort_order) VALUES (?, ?, ?, ?)'
    );
    req.files.screenshots.forEach((file, i) => {
      insertScreenshot.run(req.params.id, `/uploads/screenshots/${file.filename}`, null, startOrder + i);
    });
  }

  res.json({
    message: 'App updated and resubmitted for review',
    app: db.prepare('SELECT * FROM apps WHERE id = ?').get(req.params.id),
  });
});

// POST /apps/:id/versions - Add new version
router.post('/:id/versions', requireAuth, requireDeveloper, upload.fields([
  { name: 'app_file', maxCount: 1 }
]), async (req, res) => {
  const db = getDb();
  const app = db.prepare('SELECT * FROM apps WHERE id = ? AND developer_id = ?').get(req.params.id, req.user.id);

  if (!app) {
    return res.status(404).json({ error: 'App not found or access denied' });
  }

  const { version, changelog, platform, min_os_version, external_file_url, external_file_size } = req.body;

  if (!version || (!req.files?.app_file?.[0] && !external_file_url)) {
    return res.status(400).json({ error: 'Version and either an app file or external URL are required' });
  }
  if (!/^[a-zA-Z0-9.\-_+]{1,50}$/.test(version)) {
    return res.status(400).json({ error: 'Version format is invalid' });
  }

  if (external_file_url && !isValidHttpUrl(external_file_url)) {
    return res.status(400).json({ error: 'external_file_url must be a valid http or https URL' });
  }

  let fileUrl, fileSize, fileHash = null;
  if (req.files?.app_file?.[0]) {
    const file = req.files.app_file[0];
    fileUrl = `/uploads/app-files/${file.filename}`;
    fileSize = file.size;
    fileHash = await streamHash(file.path);
  } else {
    fileUrl = external_file_url;
    fileSize = external_file_size ? Number(external_file_size) : null;
  }

  db.prepare(`
    INSERT INTO app_versions (app_id, version, changelog, file_url, file_size, file_hash, platform, min_os_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.id, version, changelog || '', fileUrl, fileSize, fileHash, platform || 'windows', min_os_version || null);

  db.prepare("UPDATE apps SET status = 'pending', updated_at = datetime('now') WHERE id = ?").run(req.params.id);

  res.status(201).json({ message: 'New version submitted for review' });
});

// GET /apps/developer/mine - Developer's apps
router.get('/developer/mine', requireAuth, requireDeveloper, (req, res) => {
  const db = getDb();
  const apps = db.prepare(
    'SELECT * FROM apps WHERE developer_id = ? ORDER BY updated_at DESC'
  ).all(req.user.id);
  res.json({ apps });
});

// GET /apps/:id/manage - Full app detail for the developer that owns it
router.get('/:id/manage', requireAuth, requireDeveloper, (req, res) => {
  const db = getDb();
  const app = db.prepare(`
    SELECT a.*, u.username as developer_name, u.email as developer_email, u.display_name as developer_display
    FROM apps a JOIN users u ON a.developer_id = u.id WHERE a.id = ? AND a.developer_id = ?
  `).get(req.params.id, req.user.id);

  if (!app) return res.status(404).json({ error: 'App not found or access denied' });

  app.screenshots = db.prepare('SELECT * FROM app_screenshots WHERE app_id = ? ORDER BY sort_order').all(app.id);
  app.versions = db.prepare('SELECT * FROM app_versions WHERE app_id = ? ORDER BY created_at DESC').all(app.id);

  res.json({ app });
});

// POST /apps/:slug/reviews - Submit review
router.post('/:slug/reviews', requireAuth, (req, res) => {
  const { rating, title, body } = req.body;
  const db = getDb();

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5' });
  }

  const app = db.prepare("SELECT * FROM apps WHERE slug = ? AND status = 'approved'").get(req.params.slug);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const existingReview = db.prepare('SELECT id FROM reviews WHERE app_id = ? AND user_id = ?').get(app.id, req.user.id);
  if (existingReview) {
    return res.status(409).json({ error: 'You have already reviewed this app' });
  }

  db.prepare(
    'INSERT INTO reviews (app_id, user_id, rating, title, body) VALUES (?, ?, ?, ?, ?)'
  ).run(app.id, req.user.id, rating, title || '', body || '');

  const stats = db.prepare('SELECT AVG(rating) as avg, COUNT(*) as count FROM reviews WHERE app_id = ?').get(app.id);
  db.prepare('UPDATE apps SET rating_avg = ?, rating_count = ? WHERE id = ?').run(
    Math.round(stats.avg * 10) / 10, stats.count, app.id
  );

  res.status(201).json({ message: 'Review submitted' });
});

// POST /apps/:id/download - Track download
router.post('/:id/download', (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT * FROM apps WHERE id = ? AND status = 'approved'").get(req.params.id);

  if (!app) return res.status(404).json({ error: 'App not found' });

  const version = db.prepare(
    "SELECT id FROM app_versions WHERE app_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1"
  ).get(req.params.id);

  db.prepare(
    'INSERT INTO downloads (app_id, version_id, user_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?)'
  ).run(app.id, version?.id || null, req.user?.id || null, req.ip, req.headers['user-agent'] || null);

  db.prepare('UPDATE apps SET downloads_count = downloads_count + 1 WHERE id = ?').run(app.id);
  if (version) {
    db.prepare('UPDATE app_versions SET downloads_count = downloads_count + 1 WHERE id = ?').run(version.id);
  }

  res.json({ message: 'Download tracked' });
});

// GET /apps/:slug/reviews - Get reviews
router.get('/:slug/reviews', (req, res) => {
  const db = getDb();
  const app = db.prepare("SELECT id FROM apps WHERE slug = ? AND status = 'approved'").get(req.params.slug);
  if (!app) return res.status(404).json({ error: 'App not found' });

  const reviews = db.prepare(
    'SELECT r.*, u.username, u.avatar_url FROM reviews r JOIN users u ON r.user_id = u.id WHERE r.app_id = ? ORDER BY r.created_at DESC'
  ).all(app.id);

  res.json({ reviews });
});

// DELETE /apps/:id/screenshots/:screenshotId
router.delete('/:id/screenshots/:screenshotId', requireAuth, requireDeveloper, (req, res) => {
  const db = getDb();
  const app = db.prepare('SELECT * FROM apps WHERE id = ? AND developer_id = ?').get(req.params.id, req.user.id);
  if (!app) return res.status(404).json({ error: 'App not found or access denied' });

  const screenshot = db.prepare('SELECT * FROM app_screenshots WHERE id = ? AND app_id = ?')
    .get(req.params.screenshotId, req.params.id);
  if (!screenshot) return res.status(404).json({ error: 'Screenshot not found' });

  const filePath = path.resolve(UPLOADS_DIR, screenshot.url.replace(/^\/uploads\//, ''));
  if (filePath.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM app_screenshots WHERE id = ?').run(req.params.screenshotId);
  res.json({ message: 'Screenshot deleted' });
});

// POST /apps/:slug/reviews/:reviewId/vote
router.post('/:slug/reviews/:reviewId/vote', requireAuth, (req, res) => {
  const { vote } = req.body;
  if (vote !== 1 && vote !== -1) {
    return res.status(400).json({ error: 'Vote must be 1 or -1' });
  }

  const db = getDb();
  const existing = db.prepare(
    'SELECT * FROM review_votes WHERE review_id = ? AND user_id = ?'
  ).get(req.params.reviewId, req.user.id);

  if (existing) {
    if (existing.vote === vote) {
      db.prepare('DELETE FROM review_votes WHERE id = ?').run(existing.id);
    } else {
      db.prepare('UPDATE review_votes SET vote = ? WHERE id = ?').run(vote, existing.id);
    }
  } else {
    db.prepare('INSERT INTO review_votes (review_id, user_id, vote) VALUES (?, ?, ?)')
      .run(req.params.reviewId, req.user.id, vote);
  }

  const helpful = db.prepare(
    'SELECT COALESCE(SUM(vote), 0) as count FROM review_votes WHERE review_id = ?'
  ).get(req.params.reviewId);

  db.prepare('UPDATE reviews SET helpful_count = ? WHERE id = ?').run(helpful.count, req.params.reviewId);
  res.json({ helpful_count: helpful.count });
});

// POST /apps/:slug/install - Install app for user
router.post('/:slug/install', requireAuth, (req, res) => {
  const db = getDb();
  const app = db.prepare('SELECT id FROM apps WHERE slug = ?').get(req.params.slug);

  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }

  const latestVersion = db.prepare(
    "SELECT id FROM app_versions WHERE app_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 1"
  ).get(app.id);

  try {
    db.prepare(`
      INSERT OR REPLACE INTO app_installations (user_id, app_id, version_id, installed_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(req.user.id, app.id, latestVersion?.id || null);

    res.json({ success: true, message: 'App installed' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /apps/:slug/install - Uninstall app for user
router.delete('/:slug/install', requireAuth, (req, res) => {
  const db = getDb();
  const app = db.prepare('SELECT id FROM apps WHERE slug = ?').get(req.params.slug);

  if (!app) {
    return res.status(404).json({ error: 'App not found' });
  }

  try {
    const result = db.prepare(
      'DELETE FROM app_installations WHERE user_id = ? AND app_id = ?'
    ).run(req.user.id, app.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'App not installed' });
    }

    res.json({ success: true, message: 'App uninstalled' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
