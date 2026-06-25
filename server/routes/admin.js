const express = require('express');
const router = express.Router();
const { User, App, AppVersion, AppScreenshot, Review, DeveloperApplication } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');

router.use(requireAuth, requireAdmin);

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /admin/dashboard
router.get('/dashboard', async (req, res, next) => {
  try {
    const [totalDownloads] = await App.aggregate([{ $group: { _id: null, total: { $sum: '$downloads_count' } } }]);
    const stats = {
      total_users: await User.countDocuments(),
      total_apps: await App.countDocuments(),
      pending_apps: await App.countDocuments({ status: 'pending' }),
      approved_apps: await App.countDocuments({ status: 'approved' }),
      total_downloads: totalDownloads?.total || 0,
      total_reviews: await Review.countDocuments(),
      pending_developers: await DeveloperApplication.countDocuments({ status: 'pending' }),
      pending_versions: await AppVersion.countDocuments({ status: 'pending' }),
    };
    res.json({ stats });
  } catch (err) { next(err); }
});

// GET /admin/users
router.get('/users', async (req, res, next) => {
  try {
    const { search, role, limit = 50, offset = 0 } = req.query;
    const filter = {};
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ username: re }, { email: re }, { display_name: re }];
    }
    if (role) filter.role = role;

    const total = await User.countDocuments(filter);
    const docs = await User.find(filter, 'username email display_name role email_verified created_at')
      .sort({ created_at: -1 })
      .skip(Number(offset))
      .limit(Number(limit));

    res.json({ users: docs.map(u => u.toJSON()), total });
  } catch (err) { next(err); }
});

// PATCH /admin/users/:id/role
router.patch('/users/:id/role', async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'developer', 'admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

    const user = await User.findByIdAndUpdate(req.params.id, { role });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: `User role updated to ${role}` });
  } catch (err) { next(err); }
});

// PATCH /admin/users/:id/verify
router.patch('/users/:id/verify', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { email_verified: true, verification_token: null });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'Email verified' });
  } catch (err) { next(err); }
});

// GET /admin/apps
router.get('/apps', async (req, res, next) => {
  try {
    const { status, search, category, limit = 50, offset = 0 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) {
      const re = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ name: re }, { description: re }];
    }

    const total = await App.countDocuments(filter);
    const docs = await App.find(filter)
      .sort({ updated_at: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .populate('developer_id', 'username email display_name');

    const apps = docs.map(d => {
      const obj = d.toJSON();
      if (obj.developer_id && typeof obj.developer_id === 'object') {
        obj.developer_name = obj.developer_id.username;
        obj.developer_email = obj.developer_id.email;
        obj.developer_id = obj.developer_id.id;
      }
      return obj;
    });

    res.json({ apps, total });
  } catch (err) { next(err); }
});

// GET /admin/apps/:id
router.get('/apps/:id', async (req, res, next) => {
  try {
    const doc = await App.findById(req.params.id).populate('developer_id', 'username email display_name');
    if (!doc) return res.status(404).json({ error: 'App not found' });

    const app = doc.toJSON();
    if (app.developer_id && typeof app.developer_id === 'object') {
      app.developer_name = app.developer_id.username;
      app.developer_email = app.developer_id.email;
      app.developer_display = app.developer_id.display_name;
      app.developer_id = app.developer_id.id;
    }

    const screenshots = await AppScreenshot.find({ app_id: doc._id }).sort({ sort_order: 1 });
    const versions = await AppVersion.find({ app_id: doc._id }).sort({ created_at: -1 });
    const reviewDocs = await Review.find({ app_id: doc._id })
      .sort({ created_at: -1 })
      .populate('user_id', 'username');

    app.screenshots = screenshots.map(s => s.toJSON());
    app.versions = versions.map(v => v.toJSON());
    app.reviews = reviewDocs.map(r => {
      const obj = r.toJSON();
      obj.username = r.user_id?.username;
      obj.user_id = r.user_id?._id?.toString();
      return obj;
    });

    res.json({ app });
  } catch (err) { next(err); }
});

// PATCH /admin/apps/:id/review
router.patch('/apps/:id/review', async (req, res, next) => {
  try {
    const { status, review_notes } = req.body;
    if (!['approved', 'rejected', 'reviewing', 'suspended'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const app = await App.findById(req.params.id);
    if (!app) return res.status(404).json({ error: 'App not found' });

    app.status = status;
    app.review_notes = review_notes || null;
    if (status === 'approved' && !app.published_at) app.published_at = new Date();
    await app.save();

    res.json({ message: `App ${status}`, app: app.toJSON() });
  } catch (err) { next(err); }
});

// PATCH /admin/apps/:id/versions/:versionId/url
router.patch('/apps/:id/versions/:versionId/url', async (req, res, next) => {
  try {
    const { file_url, file_size } = req.body;
    if (!file_url) return res.status(400).json({ error: 'file_url is required' });

    const version = await AppVersion.findOne({ _id: req.params.versionId, app_id: req.params.id });
    if (!version) return res.status(404).json({ error: 'Version not found' });

    version.file_url = file_url;
    if (file_size) version.file_size = Number(file_size);
    await version.save();

    res.json({ message: 'Download URL updated', version: version.toJSON() });
  } catch (err) { next(err); }
});

// PATCH /admin/apps/:id/versions/:versionId/review
router.patch('/apps/:id/versions/:versionId/review', async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const version = await AppVersion.findOneAndUpdate(
      { _id: req.params.versionId, app_id: req.params.id },
      { status }
    );
    if (!version) return res.status(404).json({ error: 'Version not found' });
    res.json({ message: `Version ${status}` });
  } catch (err) { next(err); }
});

// DELETE /admin/apps/:id (soft delete)
router.delete('/apps/:id', async (req, res, next) => {
  try {
    const app = await App.findByIdAndUpdate(req.params.id, { status: 'removed' });
    if (!app) return res.status(404).json({ error: 'App not found' });
    res.json({ message: 'App removed' });
  } catch (err) { next(err); }
});

// GET /admin/developer-applications
router.get('/developer-applications', async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const docs = await DeveloperApplication.find(filter)
      .sort({ created_at: -1 })
      .populate('user_id', 'username email');

    const applications = docs.map(d => {
      const obj = d.toJSON();
      if (obj.user_id && typeof obj.user_id === 'object') {
        obj.username = obj.user_id.username;
        obj.email = obj.user_id.email;
        obj.user_id = obj.user_id.id;
      }
      return obj;
    });

    res.json({ applications });
  } catch (err) { next(err); }
});

// PATCH /admin/developer-applications/:id/review
router.patch('/developer-applications/:id/review', async (req, res, next) => {
  try {
    const { status, review_notes } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const application = await DeveloperApplication.findById(req.params.id);
    if (!application) return res.status(404).json({ error: 'Application not found' });

    application.status = status;
    application.reviewed_by = req.user.id;
    application.review_notes = review_notes || null;
    application.reviewed_at = new Date();
    await application.save();

    if (status === 'approved') {
      await User.findByIdAndUpdate(application.user_id, { role: 'developer' });
    }

    res.json({ message: `Developer application ${status}` });
  } catch (err) { next(err); }
});

// GET /admin/reviews
router.get('/reviews', async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const total = await Review.countDocuments();
    const docs = await Review.find()
      .sort({ created_at: -1 })
      .skip(Number(offset))
      .limit(Number(limit))
      .populate('user_id', 'username')
      .populate('app_id', 'name slug');

    const reviews = docs.map(r => {
      const obj = r.toJSON();
      obj.username = r.user_id?.username;
      obj.app_name = r.app_id?.name;
      obj.app_slug = r.app_id?.slug;
      obj.user_id = r.user_id?._id?.toString();
      obj.app_id = r.app_id?._id?.toString();
      return obj;
    });

    res.json({ reviews, total });
  } catch (err) { next(err); }
});

// DELETE /admin/reviews/:id
router.delete('/reviews/:id', async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ error: 'Review not found' });

    const appId = review.app_id;
    await Review.deleteOne({ _id: review._id });

    const [stat] = await Review.aggregate([
      { $match: { app_id: appId } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await App.updateOne({ _id: appId }, {
      rating_avg: stat ? Math.round(stat.avg * 10) / 10 : 0,
      rating_count: stat?.count || 0,
    });

    res.json({ message: 'Review deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
