const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const { App, AppVersion, AppScreenshot, Review, ReviewVote, Download, AppInstallation } = require('../database');
const { requireAuth, requireDeveloper } = require('../middleware/auth');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

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
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedImages = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (file.fieldname === 'app_file') return cb(null, true);
    if (['icon', 'banner', 'screenshots'].includes(file.fieldname)) {
      if (allowedImages.includes(file.mimetype)) return cb(null, true);
      return cb(new Error('Only image files allowed'));
    }
    cb(null, true);
  },
});

function slugify(text) {
  const slug = text.toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `app-${Date.now()}`;
}

function isValidHttpUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function deleteUploadFile(urlPath) {
  if (!urlPath || !urlPath.startsWith('/uploads/')) return;
  const filePath = path.resolve(UPLOADS_DIR, urlPath.replace(/^\/uploads\//, ''));
  if (!filePath.startsWith(UPLOADS_DIR + path.sep)) return;
  try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}
}

function streamHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function flattenApp(doc, devFields = {}) {
  const obj = doc.toJSON();
  // If developer_id is populated, extract useful fields then reduce to ID
  if (obj.developer_id && typeof obj.developer_id === 'object') {
    obj.developer_name = obj.developer_id.username;
    obj.developer_display = obj.developer_id.display_name;
    obj.developer_email = obj.developer_id.email;
    obj.developer_id = obj.developer_id.id;
  }
  Object.assign(obj, devFields);
  return obj;
}

async function recalcRating(appId) {
  const [stat] = await Review.aggregate([
    { $match: { app_id: appId } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  const avg = stat ? Math.round(stat.avg * 10) / 10 : 0;
  const count = stat?.count || 0;
  await App.updateOne({ _id: appId }, { rating_avg: avg, rating_count: count });
  return { avg, count };
}

// GET /apps - Public store listing
router.get('/', async (req, res, next) => {
  try {
    const { category, search, sort, limit = 20, offset = 0, developer_id } = req.query;
    if (search && search.length > 200) return res.status(400).json({ error: 'Search query too long' });

    const filter = { status: 'approved' };
    if (category) filter.category = category;
    if (developer_id) filter.developer_id = developer_id;
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: re }, { description: re }, { short_description: re }];
    }

    const total = await App.countDocuments(filter);

    let sortObj = { downloads_count: -1 };
    switch (sort) {
      case 'newest': sortObj = { published_at: -1 }; break;
      case 'oldest': sortObj = { published_at: 1 }; break;
      case 'rating': sortObj = { rating_avg: -1 }; break;
      case 'downloads': sortObj = { downloads_count: -1 }; break;
      case 'name': sortObj = { name: 1 }; break;
    }

    const docs = await App.find(filter)
      .sort(sortObj)
      .skip(Number(offset))
      .limit(Number(limit))
      .populate('developer_id', 'username display_name');

    const apps = docs.map(d => flattenApp(d));
    res.json({ apps, total, limit: Number(limit), offset: Number(offset) });
  } catch (err) { next(err); }
});

// GET /apps/categories
router.get('/categories', async (req, res, next) => {
  try {
    const agg = await App.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    const categories = agg.map(a => ({ category: a._id, count: a.count }));
    res.json({ categories });
  } catch (err) { next(err); }
});

// GET /apps/developer/mine - must be before /:slug
router.get('/developer/mine', requireAuth, requireDeveloper, async (req, res, next) => {
  try {
    const docs = await App.find({ developer_id: req.user.id }).sort({ updated_at: -1 });
    const apps = docs.map(d => d.toJSON());
    res.json({ apps });
  } catch (err) { next(err); }
});

// GET /apps/:slug - Single app detail
router.get('/:slug', async (req, res, next) => {
  try {
    const doc = await App.findOne({ slug: req.params.slug, status: 'approved' })
      .populate('developer_id', 'username display_name');
    if (!doc) return res.status(404).json({ error: 'App not found' });

    const app = flattenApp(doc);

    if (req.params.slug === 'presona') {
      app.developer_display = 'Primers Group';
      app.short_description = 'Your personal AI agent. Fully offline. Knows your work. Powered by PrimersGPT.';
    }

    const screenshots = await AppScreenshot.find({ app_id: doc._id }).sort({ sort_order: 1 });
    app.screenshots = screenshots.map(s => s.toJSON());

    const latestVer = await AppVersion.findOne({ app_id: doc._id, status: 'approved' }).sort({ created_at: -1 });
    app.latest_version = latestVer ? latestVer.toJSON() : null;

    if (req.params.slug === 'presona' && app.latest_version) {
      app.latest_version.file_url = 'https://archive.org/download/presona-installer/Presona-Installer.exe';
    }

    if (req.user) {
      const inst = await AppInstallation.findOne({ user_id: req.user.id, app_id: doc._id });
      app.is_installed = !!inst;
    } else {
      app.is_installed = false;
    }

    const reviewDocs = await Review.find({ app_id: doc._id })
      .sort({ created_at: -1 })
      .limit(10)
      .populate('user_id', 'username avatar_url');

    app.reviews = reviewDocs.map(r => {
      const obj = r.toJSON();
      obj.username = r.user_id?.username;
      obj.avatar_url = r.user_id?.avatar_url;
      obj.user_id = r.user_id?._id?.toString();
      return obj;
    });

    res.json({ app });
  } catch (err) { next(err); }
});

// POST /apps - Create new app
router.post('/', requireAuth, requireDeveloper, upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'screenshots', maxCount: 10 },
  { name: 'app_file', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const { name, description, short_description, category, website, support_email, privacy_url, version, changelog, platform, min_os_version, external_file_url, external_file_size } = req.body;

    if (!name || !description || !category) return res.status(400).json({ error: 'Name, description, and category are required' });
    if (name.length < 2 || name.length > 200) return res.status(400).json({ error: 'App name must be 2–200 characters' });
    if (description.length > 50000) return res.status(400).json({ error: 'Description must be under 50,000 characters' });
    if (external_file_url && !isValidHttpUrl(external_file_url)) return res.status(400).json({ error: 'external_file_url must be a valid http or https URL' });
    if (version && !/^[a-zA-Z0-9.\-_+]{1,50}$/.test(version)) return res.status(400).json({ error: 'Version format is invalid' });

    const baseSlug = slugify(name);
    const slugConflict = await App.findOne({ slug: baseSlug });
    const finalSlug = slugConflict ? `${baseSlug}-${Date.now()}` : baseSlug;

    const icon_url = req.files?.icon?.[0] ? `/uploads/icons/${req.files.icon[0].filename}` : null;
    const banner_url = req.files?.banner?.[0] ? `/uploads/banners/${req.files.banner[0].filename}` : null;

    const newApp = await App.create({
      developer_id: req.user.id,
      name,
      slug: finalSlug,
      description,
      short_description: short_description || description.substring(0, 200),
      category,
      icon_url,
      banner_url,
      website: website || null,
      support_email: support_email || null,
      privacy_url: privacy_url || null,
    });

    if (req.files?.screenshots) {
      const inserts = req.files.screenshots.map((file, i) => ({
        app_id: newApp._id,
        url: `/uploads/screenshots/${file.filename}`,
        caption: null,
        sort_order: i,
      }));
      await AppScreenshot.insertMany(inserts);
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
      await AppVersion.create({
        app_id: newApp._id,
        version,
        changelog: changelog || 'Initial release',
        file_url: fileUrl,
        file_size: fileSize,
        file_hash: fileHash,
        platform: platform || 'windows',
        min_os_version: min_os_version || null,
      });
    }

    res.status(201).json({ message: 'App submitted for review', app: newApp.toJSON() });
  } catch (err) { next(err); }
});

// PATCH /apps/:id - Update app
router.patch('/:id', requireAuth, requireDeveloper, upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'screenshots', maxCount: 10 },
]), async (req, res, next) => {
  try {
    const app = await App.findOne({ _id: req.params.id, developer_id: req.user.id });
    if (!app) return res.status(404).json({ error: 'App not found or access denied' });

    const { name, description, short_description, category, website, support_email, privacy_url } = req.body;
    const updates = { status: 'pending' };

    if (name) {
      const newSlug = slugify(name);
      const slugConflict = await App.findOne({ slug: newSlug, _id: { $ne: app._id } });
      updates.name = name;
      updates.slug = slugConflict ? `${newSlug}-${Date.now()}` : newSlug;
    }
    if (description) updates.description = description;
    if (short_description) updates.short_description = short_description;
    if (category) updates.category = category;
    if (website !== undefined) updates.website = website;
    if (support_email !== undefined) updates.support_email = support_email;
    if (privacy_url !== undefined) updates.privacy_url = privacy_url;

    if (req.files?.icon?.[0]) {
      deleteUploadFile(app.icon_url);
      updates.icon_url = `/uploads/icons/${req.files.icon[0].filename}`;
    }
    if (req.files?.banner?.[0]) {
      deleteUploadFile(app.banner_url);
      updates.banner_url = `/uploads/banners/${req.files.banner[0].filename}`;
    }

    const updated = await App.findByIdAndUpdate(app._id, { $set: updates }, { new: true });

    if (req.files?.screenshots) {
      const lastSS = await AppScreenshot.findOne({ app_id: app._id }).sort({ sort_order: -1 });
      const startOrder = (lastSS?.sort_order ?? -1) + 1;
      const inserts = req.files.screenshots.map((file, i) => ({
        app_id: app._id,
        url: `/uploads/screenshots/${file.filename}`,
        caption: null,
        sort_order: startOrder + i,
      }));
      await AppScreenshot.insertMany(inserts);
    }

    res.json({ message: 'App updated and resubmitted for review', app: updated.toJSON() });
  } catch (err) { next(err); }
});

// POST /apps/:id/versions - Add new version
router.post('/:id/versions', requireAuth, requireDeveloper, upload.fields([
  { name: 'app_file', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const app = await App.findOne({ _id: req.params.id, developer_id: req.user.id });
    if (!app) return res.status(404).json({ error: 'App not found or access denied' });

    const { version, changelog, platform, min_os_version, external_file_url, external_file_size } = req.body;

    if (!version || (!req.files?.app_file?.[0] && !external_file_url)) {
      return res.status(400).json({ error: 'Version and either an app file or external URL are required' });
    }
    if (!/^[a-zA-Z0-9.\-_+]{1,50}$/.test(version)) return res.status(400).json({ error: 'Version format is invalid' });
    if (external_file_url && !isValidHttpUrl(external_file_url)) return res.status(400).json({ error: 'external_file_url must be a valid http or https URL' });

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

    await AppVersion.create({
      app_id: app._id,
      version,
      changelog: changelog || '',
      file_url: fileUrl,
      file_size: fileSize,
      file_hash: fileHash,
      platform: platform || 'windows',
      min_os_version: min_os_version || null,
    });

    await App.findByIdAndUpdate(app._id, { status: 'pending' });
    res.status(201).json({ message: 'New version submitted for review' });
  } catch (err) { next(err); }
});

// GET /apps/:id/manage - Full detail for owner
router.get('/:id/manage', requireAuth, requireDeveloper, async (req, res, next) => {
  try {
    const doc = await App.findOne({ _id: req.params.id, developer_id: req.user.id })
      .populate('developer_id', 'username email display_name');
    if (!doc) return res.status(404).json({ error: 'App not found or access denied' });

    const app = flattenApp(doc);
    const screenshots = await AppScreenshot.find({ app_id: doc._id }).sort({ sort_order: 1 });
    const versions = await AppVersion.find({ app_id: doc._id }).sort({ created_at: -1 });
    app.screenshots = screenshots.map(s => s.toJSON());
    app.versions = versions.map(v => v.toJSON());

    res.json({ app });
  } catch (err) { next(err); }
});

// POST /apps/:slug/reviews - Submit review
router.post('/:slug/reviews', requireAuth, async (req, res, next) => {
  try {
    const { rating, title, body } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating must be between 1 and 5' });

    const app = await App.findOne({ slug: req.params.slug, status: 'approved' });
    if (!app) return res.status(404).json({ error: 'App not found' });

    const existingReview = await Review.findOne({ app_id: app._id, user_id: req.user.id });
    if (existingReview) return res.status(409).json({ error: 'You have already reviewed this app' });

    await Review.create({ app_id: app._id, user_id: req.user.id, rating, title: title || '', body: body || '' });
    await recalcRating(app._id);

    res.status(201).json({ message: 'Review submitted' });
  } catch (err) { next(err); }
});

// GET /apps/:slug/reviews
router.get('/:slug/reviews', async (req, res, next) => {
  try {
    const app = await App.findOne({ slug: req.params.slug, status: 'approved' }, '_id');
    if (!app) return res.status(404).json({ error: 'App not found' });

    const reviewDocs = await Review.find({ app_id: app._id })
      .sort({ created_at: -1 })
      .populate('user_id', 'username avatar_url');

    const reviews = reviewDocs.map(r => {
      const obj = r.toJSON();
      obj.username = r.user_id?.username;
      obj.avatar_url = r.user_id?.avatar_url;
      obj.user_id = r.user_id?._id?.toString();
      return obj;
    });

    res.json({ reviews });
  } catch (err) { next(err); }
});

// POST /apps/:id/download - Track download
router.post('/:id/download', async (req, res, next) => {
  try {
    const app = await App.findOne({ _id: req.params.id, status: 'approved' });
    if (!app) return res.status(404).json({ error: 'App not found' });

    const version = await AppVersion.findOne({ app_id: app._id, status: 'approved' }).sort({ created_at: -1 });

    await Download.create({
      app_id: app._id,
      version_id: version?._id || null,
      user_id: req.user?._id || null,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'] || null,
    });

    await App.updateOne({ _id: app._id }, { $inc: { downloads_count: 1 } });
    if (version) await AppVersion.updateOne({ _id: version._id }, { $inc: { downloads_count: 1 } });

    res.json({ message: 'Download tracked' });
  } catch (err) { next(err); }
});

// DELETE /apps/:id/screenshots/:screenshotId
router.delete('/:id/screenshots/:screenshotId', requireAuth, requireDeveloper, async (req, res, next) => {
  try {
    const app = await App.findOne({ _id: req.params.id, developer_id: req.user.id });
    if (!app) return res.status(404).json({ error: 'App not found or access denied' });

    const screenshot = await AppScreenshot.findOne({ _id: req.params.screenshotId, app_id: app._id });
    if (!screenshot) return res.status(404).json({ error: 'Screenshot not found' });

    const filePath = path.resolve(UPLOADS_DIR, screenshot.url.replace(/^\/uploads\//, ''));
    if (filePath.startsWith(UPLOADS_DIR + path.sep) && fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await AppScreenshot.deleteOne({ _id: screenshot._id });
    res.json({ message: 'Screenshot deleted' });
  } catch (err) { next(err); }
});

// POST /apps/:slug/reviews/:reviewId/vote
router.post('/:slug/reviews/:reviewId/vote', requireAuth, async (req, res, next) => {
  try {
    const { vote } = req.body;
    if (vote !== 1 && vote !== -1) return res.status(400).json({ error: 'Vote must be 1 or -1' });

    const existing = await ReviewVote.findOne({ review_id: req.params.reviewId, user_id: req.user.id });

    if (existing) {
      if (existing.vote === vote) {
        await ReviewVote.deleteOne({ _id: existing._id });
      } else {
        existing.vote = vote;
        await existing.save();
      }
    } else {
      await ReviewVote.create({ review_id: req.params.reviewId, user_id: req.user.id, vote });
    }

    const [agg] = await ReviewVote.aggregate([
      { $match: { review_id: new mongoose.Types.ObjectId(req.params.reviewId) } },
      { $group: { _id: null, total: { $sum: '$vote' } } },
    ]);
    const helpfulCount = agg?.total || 0;
    await Review.findByIdAndUpdate(req.params.reviewId, { helpful_count: helpfulCount });

    res.json({ helpful_count: helpfulCount });
  } catch (err) { next(err); }
});

// POST /apps/:slug/install
router.post('/:slug/install', requireAuth, async (req, res, next) => {
  try {
    const app = await App.findOne({ slug: req.params.slug });
    if (!app) return res.status(404).json({ error: 'App not found' });

    const latestVersion = await AppVersion.findOne({ app_id: app._id, status: 'approved' }).sort({ created_at: -1 });

    await AppInstallation.updateOne(
      { user_id: req.user.id, app_id: app._id },
      { $set: { version_id: latestVersion?._id || null, installed_at: new Date(), updated_at: new Date() } },
      { upsert: true }
    );

    res.json({ success: true, message: 'App installed' });
  } catch (err) { next(err); }
});

// DELETE /apps/:slug/install
router.delete('/:slug/install', requireAuth, async (req, res, next) => {
  try {
    const app = await App.findOne({ slug: req.params.slug });
    if (!app) return res.status(404).json({ error: 'App not found' });

    const result = await AppInstallation.deleteOne({ user_id: req.user.id, app_id: app._id });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'App not installed' });

    res.json({ success: true, message: 'App uninstalled' });
  } catch (err) { next(err); }
});

module.exports = router;
