const mongoose = require('mongoose');
const crypto = require('crypto');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/primers_store';

async function connectDb() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB connected');
  }
}

const toJSON = {
  transform(doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  },
};

const ts = (updated = true) => ({
  timestamps: updated
    ? { createdAt: 'created_at', updatedAt: 'updated_at' }
    : { createdAt: 'created_at', updatedAt: false },
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  email: { type: String, unique: true, required: true },
  password_hash: { type: String, required: true },
  display_name: String,
  role: { type: String, default: 'user', enum: ['user', 'developer', 'admin'] },
  email_verified: { type: Boolean, default: false },
  verification_token: String,
  avatar_url: String,
  bio: String,
}, { ...ts(), toJSON });

const AppSchema = new mongoose.Schema({
  developer_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  slug: { type: String, unique: true, required: true },
  description: String,
  short_description: String,
  category: { type: String, required: true },
  icon_url: String,
  banner_url: String,
  website: String,
  support_email: String,
  privacy_url: String,
  status: { type: String, default: 'pending', enum: ['pending', 'reviewing', 'approved', 'rejected', 'suspended', 'removed'] },
  review_notes: String,
  price: { type: Number, default: 0.0 },
  downloads_count: { type: Number, default: 0 },
  rating_avg: { type: Number, default: 0.0 },
  rating_count: { type: Number, default: 0 },
  published_at: Date,
}, { ...ts(), toJSON });

const AppVersionSchema = new mongoose.Schema({
  app_id: { type: mongoose.Schema.Types.ObjectId, ref: 'App', required: true },
  version: { type: String, required: true },
  changelog: String,
  file_url: String,
  file_size: Number,
  file_hash: String,
  platform: { type: String, default: 'windows', enum: ['windows', 'macos', 'linux', 'android', 'ios', 'web'] },
  min_os_version: String,
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  downloads_count: { type: Number, default: 0 },
}, { ...ts(false), toJSON });

const AppScreenshotSchema = new mongoose.Schema({
  app_id: { type: mongoose.Schema.Types.ObjectId, ref: 'App', required: true },
  url: { type: String, required: true },
  caption: String,
  sort_order: { type: Number, default: 0 },
}, { toJSON });

const ReviewSchema = new mongoose.Schema({
  app_id: { type: mongoose.Schema.Types.ObjectId, ref: 'App', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  title: String,
  body: String,
  helpful_count: { type: Number, default: 0 },
}, { ...ts(), toJSON });

ReviewSchema.index({ app_id: 1, user_id: 1 }, { unique: true });

const ReviewVoteSchema = new mongoose.Schema({
  review_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Review', required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  vote: { type: Number, enum: [-1, 1] },
}, { toJSON });

ReviewVoteSchema.index({ review_id: 1, user_id: 1 }, { unique: true });

const DownloadSchema = new mongoose.Schema({
  app_id: { type: mongoose.Schema.Types.ObjectId, ref: 'App', required: true },
  version_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AppVersion' },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  ip_address: String,
  user_agent: String,
}, { ...ts(false), toJSON });

const DeveloperApplicationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company_name: String,
  reason: String,
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected'] },
  reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  review_notes: String,
  reviewed_at: Date,
}, { ...ts(false), toJSON });

const SessionSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, unique: true, required: true },
  expires_at: { type: Date, required: true },
}, { ...ts(false), toJSON });

const AppInstallationSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  app_id: { type: mongoose.Schema.Types.ObjectId, ref: 'App', required: true },
  version_id: { type: mongoose.Schema.Types.ObjectId, ref: 'AppVersion' },
  installed_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { toJSON });

AppInstallationSchema.index({ user_id: 1, app_id: 1 }, { unique: true });

const User = mongoose.model('User', UserSchema);
const App = mongoose.model('App', AppSchema);
const AppVersion = mongoose.model('AppVersion', AppVersionSchema);
const AppScreenshot = mongoose.model('AppScreenshot', AppScreenshotSchema);
const Review = mongoose.model('Review', ReviewSchema);
const ReviewVote = mongoose.model('ReviewVote', ReviewVoteSchema);
const Download = mongoose.model('Download', DownloadSchema);
const DeveloperApplication = mongoose.model('DeveloperApplication', DeveloperApplicationSchema);
const Session = mongoose.model('Session', SessionSchema);
const AppInstallation = mongoose.model('AppInstallation', AppInstallationSchema);

function generateToken(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === computed;
}

module.exports = {
  connectDb, generateToken, hashPassword, verifyPassword,
  User, App, AppVersion, AppScreenshot, Review, ReviewVote,
  Download, DeveloperApplication, Session, AppInstallation,
};
