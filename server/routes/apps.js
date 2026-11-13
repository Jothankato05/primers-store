const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const multer = require('multer');
const mongoose = require('mongoose');
const { App, AppVersion, AppScreenshot, Review, ReviewVote, Download, AppInstallation, recalcAppRating } = require('../database');
const { requireAuth, requireDeveloper } = require('../middleware/auth');

const { ownUploadUrl, removeUpload } = require('../storage');

// Files go straight from the browser to storage (see routes/uploads.js). These routes take
// only form fields: the uploaded files arrive as URLs we check belong to the developer.
const fieldsOnly = multer({ limits: { fields: 60, fieldSize: 64 * 1024, files: 0 } }).none();

const SHA256 = /^[a-f0-9]{64}$/i;

// Screenshot URLs arrive as repeated fields or one JSON array.
function listField(v) {
  if (v === undefined || v === null || v === '') return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string' && v.trim().startsWith('[')) { try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch { return null; } }
  return [v];
}

// Read the uploaded-file fields of a request. Returns { error } or the checked values.
function readUploads(body, userId, { withMedia = true, withFile = true } = {}) {
  const out = {};
  if (withMedia) {
    for (const kind of ['icon', 'banner']) {
      const v = body[`${kind}_url`];
      if (v) {
        out[`${kind}_url`] = ownUploadUrl(v, userId, kind);
        if (!out[`${kind}_url`]) return { error: `The ${kind} upload is not valid. Please upload it again.` };
      }
    }
    const shots = listField(body.screenshot_urls);
    if (shots === null || shots.length > 10) return { error: 'Up to 10 screenshots are allowed' };
    out.screenshots = [];
    for (const v of shots) {
      const u = ownUploadUrl(v, userId, 'screenshot');
      if (!u) return { error: 'A screenshot upload is not valid. Please upload it again.' };
      out.screenshots.push(u);
    }
  }
  if (withFile && body.app_file_url) {
    out.app_file_url = ownUploadUrl(body.app_file_url, userId, 'app_file');
    if (!out.app_file_url) return { error: 'The app file upload is not valid. Please upload it again.' };
    const size = Number(body.app_file_size);
    if (!Number.isFinite(size) || size <= 0) return { error: 'app_file_size must be a number' };
    out.app_file_size = size;
    if (body.app_file_sha256 && !SHA256.test(body.app_file_sha256)) return { error: 'app_file_sha256 is not a SHA-256 hash' };
    out.app_file_sha256 = body.app_file_sha256 ? body.app_file_sha256.toLowerCase() : null;
  }
  return out;
}

// Slugs that collide with static /apps/* routes and would make the app unreachable
const RESERVED_SLUGS = new Set(['categories', 'developer']);

// Slugify — normalize Unicode, strip diacritics, fall back to timestamp for all-non-ASCII names
function slugify(text) {
  const slug = text.toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug || RESERVED_SLUGS.has(slug)) return `${slug || 'app'}-${Date.now()}`;
  return slug;
}

// Validate that a URL uses http or https (blocks file://, javascript:, etc.)
function isValidHttpUrl(str) {
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch { return false; }
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Coerce a query param to a bounded integer (NaN-safe — ?limit=abc must not crash the driver)
function toInt(value, fallback, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return max ? Math.min(n, max) : n;
}

const isObjectId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

// Flatten a populated developer_id into developer_* fields
function flattenApp(doc) {
  const obj = doc.toJSON();
  if (obj.developer_id && typeof obj.developer_id === 'object') {
    obj.developer_name = obj.developer_id.username;
    obj.developer_display = obj.developer_id.display_name;
    obj.developer_email = obj.developer_id.email;
    obj.developer_id = obj.developer_id.id;
  }
  return obj;
}

// Attach latest approved version to each app in a list (single query)
async function attachLatestVersions(apps) {
  if (!apps.length) return apps;
  const ids = apps.map(a => new mongoose.Types.ObjectId(a.id));
  const versions = await AppVersion.find({ app_id: { $in: ids }, status: 'approved' }).sort({ created_at: -1 });
  const latestByApp = new Map();
  for (const v of versions) {
    const key = v.app_id.toString();
    if (!latestByApp.has(key)) latestByApp.set(key, v.toJSON());
  }
  for (const a of apps) a.latest_version = latestByApp.get(a.id) || null;
  return apps;
}

// GET /apps - Public store listing
router.get('/', async (req, res, next) => {
  try {
    const { category, search, sort, developer_id } = req.query;
    if (search && search.length > 200) return res.status(400).json({ error: 'Search query too long' });

    const limit = toInt(req.query.limit, 20, 100);
    const offset = toInt(req.query.offset, 0);

    const filter = { status: 'approved' };
    if (category && typeof category === 'string') filter.category = category;
    if (developer_id) {
      if (!isObjectId(developer_id)) return res.json({ apps: [], total: 0, limit, offset });
      filter.developer_id = developer_id;
    }
    if (search && typeof search === 'string') {
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
      .skip(offset)
      .limit(limit)
      .populate('developer_id', 'username display_name');

    const apps = await attachLatestVersions(docs.map(flattenApp));
    res.json({ apps, total, limit, offset });
  } catch (err) { next(err); }
});

// GET /apps/categories - List categories
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

// GET /apps/developer/mine - Developer's apps (must be registered before /:slug)
router.get('/developer/mine', requireAuth, requireDeveloper, async (req, res, next) => {
  try {
    const docs = await App.find({ developer_id: req.user.id }).sort({ updated_at: -1 });
    const apps = await attachLatestVersions(docs.map(d => d.toJSON()));
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

    // Override Presona display info
    if (req.params.slug === 'presona') {
      app.developer_display = 'Primers Group';
      app.short_description = 'Your personal AI agent. Fully offline. Knows your work. Powered by PrimersGPT.';
    }

    const screenshots = await AppScreenshot.find({ app_id: doc._id }).sort({ sort_order: 1 });
    app.screenshots = screenshots.map(s => s.toJSON());

    const latestVer = await AppVersion.findOne({ app_id: doc._id, status: 'approved' }).sort({ created_at: -1 });
    app.latest_version = latestVer ? latestVer.toJSON() : null;

    // Override Presona download URL to Internet Archive
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

// POST /apps - Create new app (developer only)
router.post('/', requireAuth, requireDeveloper, fieldsOnly, async (req, res, next) => {
  try {
    const { name, description, short_description, category, website, support_email, privacy_url, version, changelog, platform, min_os_version, external_file_url, external_file_size } = req.body;
    const fail = (code, error) => res.status(code).json({ error });

    if (!name || !description || !category) return fail(400, 'Name, description, and category are required');
    if (name.length < 2 || name.length > 200) return fail(400, 'App name must be 2–200 characters');
    if (description.length > 50000) return fail(400, 'Description must be under 50,000 characters');
    if (external_file_url && !isValidHttpUrl(external_file_url)) return fail(400, 'external_file_url must be a valid http or https URL');
    if (external_file_size !== undefined && external_file_size !== '' && !Number.isFinite(Number(external_file_size))) {
      return fail(400, 'external_file_size must be a number');
    }
    if (version && !/^[a-zA-Z0-9.\-_+]{1,50}$/.test(version)) return fail(400, 'Version format is invalid');
    const up = readUploads(req.body, req.user.id);
    if (up.error) return fail(400, up.error);

    const baseSlug = slugify(name);
    const slugConflict = await App.findOne({ slug: baseSlug });
    const finalSlug = slugConflict ? `${baseSlug}-${Date.now()}` : baseSlug;

    const newApp = await App.create({
      developer_id: req.user.id,
      name,
      slug: finalSlug,
      description,
      short_description: short_description || description.substring(0, 200),
      category,
      icon_url: up.icon_url || null,
      banner_url: up.banner_url || null,
      website: website || null,
      support_email: support_email || null,
      privacy_url: privacy_url || null,
    });

    if (up.screenshots.length) {
      await AppScreenshot.insertMany(up.screenshots.map((url, i) => ({ app_id: newApp._id, url, caption: null, sort_order: i })));
    }

    if (version && (up.app_file_url || external_file_url)) {
      await AppVersion.create({
        app_id: newApp._id,
        version,
        changelog: changelog || 'Initial release',
        file_url: up.app_file_url || external_file_url,
        file_size: up.app_file_url ? up.app_file_size : (external_file_size ? Number(external_file_size) : null),
        file_hash: up.app_file_url ? up.app_file_sha256 : null,
        platform: platform || 'windows',
        min_os_version: min_os_version || null,
      });
    }

    res.status(201).json({ message: 'App submitted for review', app: newApp.toJSON() });
  } catch (err) { next(err); }
});

// PATCH /apps/:id - Update app (developer, own apps only)
router.patch('/:id', requireAuth, requireDeveloper, fieldsOnly, async (req, res, next) => {
  try {
    const app = await App.findOne({ _id: req.params.id, developer_id: req.user.id });
    if (!app) return res.status(404).json({ error: 'App not found or access denied' });

    const { name, description, short_description, category, website, support_email, privacy_url } = req.body;
    const up = readUploads(req.body, req.user.id, { withFile: false });
    if (up.error) return res.status(400).json({ error: up.error });
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
    if (up.icon_url) updates.icon_url = up.icon_url;
    if (up.banner_url) updates.banner_url = up.banner_url;

    await App.updateOne({ _id: app._id }, { $set: updates });
    if (up.icon_url && app.icon_url !== up.icon_url) removeUpload(app.icon_url);
    if (up.banner_url && app.banner_url !== up.banner_url) removeUpload(app.banner_url);

    if (up.screenshots.length) {
      const count = await AppScreenshot.countDocuments({ app_id: app._id });
      if (count + up.screenshots.length > 10) return res.status(400).json({ error: 'An app can have up to 10 screenshots. Remove some first.' });
      const lastSS = await AppScreenshot.findOne({ app_id: app._id }).sort({ sort_order: -1 });
      const startOrder = (lastSS?.sort_order ?? -1) + 1;
      await AppScreenshot.insertMany(up.screenshots.map((url, i) => ({ app_id: app._id, url, caption: null, sort_order: startOrder + i })));
    }

    const updated = await App.findById(app._id);
    res.json({ message: 'App updated and resubmitted for review', app: updated.toJSON() });
  } catch (err) { next(err); }
});

// POST /apps/:id/versions - Add new version
router.post('/:id/versions', requireAuth, requireDeveloper, fieldsOnly, async (req, res, next) => {
  try {
    const app = await App.findOne({ _id: req.params.id, developer_id: req.user.id });
    if (!app) return res.status(404).json({ error: 'App not found or access denied' });

    const { version, changelog, platform, min_os_version, external_file_url, external_file_size } = req.body;
    const fail = (code, error) => res.status(code).json({ error });
    const up = readUploads(req.body, req.user.id, { withMedia: false });
    if (up.error) return fail(400, up.error);

    if (!version || (!up.app_file_url && !external_file_url)) {
      return fail(400, 'Version and either an app file or external URL are required');
    }
    if (!/^[a-zA-Z0-9.\-_+]{1,50}$/.test(version)) return fail(400, 'Version format is invalid');
    if (external_file_url && !isValidHttpUrl(external_file_url)) return fail(400, 'external_file_url must be a valid http or https URL');
    if (external_file_size !== undefined && external_file_size !== '' && !Number.isFinite(Number(external_file_size))) {
      return fail(400, 'external_file_size must be a number');
    }

    await AppVersion.create({
      app_id: app._id,
      version,
      changelog: changelog || '',
      file_url: up.app_file_url || external_file_url,
      file_size: up.app_file_url ? up.app_file_size : (external_file_size ? Number(external_file_size) : null),
      file_hash: up.app_file_url ? up.app_file_sha256 : null,
      platform: platform || 'windows',
      min_os_version: min_os_version || null,
    });

    await App.updateOne({ _id: app._id }, { status: 'pending' });
    res.status(201).json({ message: 'New version submitted for review' });
  } catch (err) { next(err); }
});

// GET /apps/:id/manage - Full app detail for the developer that owns it
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
    const { title, body } = req.body;
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const app = await App.findOne({ slug: req.params.slug, status: 'approved' });
    if (!app) return res.status(404).json({ error: 'App not found' });

    const existingReview = await Review.findOne({ app_id: app._id, user_id: req.user.id });
    if (existingReview) return res.status(409).json({ error: 'You have already reviewed this app' });

    await Review.create({
      app_id: app._id,
      user_id: req.user.id,
      rating,
      title: typeof title === 'string' ? title : '',
      body: typeof body === 'string' ? body : '',
    });
    await recalcAppRating(app._id);

    res.status(201).json({ message: 'Review submitted' });
  } catch (err) { next(err); }
});

// GET /apps/:slug/reviews - Get reviews
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
      user_id: req.user?.id || null,
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

    await AppScreenshot.deleteOne({ _id: screenshot._id });
    removeUpload(screenshot.url);
    res.json({ message: 'Screenshot deleted' });
  } catch (err) { next(err); }
});

// POST /apps/:slug/reviews/:reviewId/vote
router.post('/:slug/reviews/:reviewId/vote', requireAuth, async (req, res, next) => {
  try {
    const { vote } = req.body;
    if (vote !== 1 && vote !== -1) return res.status(400).json({ error: 'Vote must be 1 or -1' });

    const review = await Review.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const existing = await ReviewVote.findOne({ review_id: review._id, user_id: req.user.id });

    if (existing) {
      if (existing.vote === vote) {
        await ReviewVote.deleteOne({ _id: existing._id });
      } else {
        existing.vote = vote;
        await existing.save();
      }
    } else {
      await ReviewVote.create({ review_id: review._id, user_id: req.user.id, vote });
    }

    const [agg] = await ReviewVote.aggregate([
      { $match: { review_id: review._id } },
      { $group: { _id: null, total: { $sum: '$vote' } } },
    ]);
    const helpfulCount = agg?.total || 0;
    await Review.updateOne({ _id: review._id }, { helpful_count: helpfulCount });

    res.json({ helpful_count: helpfulCount });
  } catch (err) { next(err); }
});

// POST /apps/:slug/install - Install app for user
router.post('/:slug/install', requireAuth, async (req, res, next) => {
  try {
    const app = await App.findOne({ slug: req.params.slug, status: 'approved' });
    if (!app) return res.status(404).json({ error: 'App not found' });

    const latestVersion = await AppVersion.findOne({ app_id: app._id, status: 'approved' }).sort({ created_at: -1 });

    await AppInstallation.updateOne(
      { user_id: req.user.id, app_id: app._id },
      {
        $set: { version_id: latestVersion?._id || null, updated_at: new Date() },
        $setOnInsert: { installed_at: new Date() },
      },
      { upsert: true }
    );

    res.json({ success: true, message: 'App installed' });
  } catch (err) { next(err); }
});

// DELETE /apps/:slug/install - Uninstall app for user
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
