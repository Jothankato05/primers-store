// File storage for the store: developers upload straight from their browser to Vercel Blob,
// so large installers never pass through (or time out) our API. The API only hands out
// short-lived, size- and type-limited upload tokens, and later checks that any file URL a
// developer submits really is one of their own uploads.
const { del } = require('@vercel/blob');
const { generateClientTokenFromReadWriteToken } = require('@vercel/blob/client');

const MB = 1024 * 1024;
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

// App packages people actually ship to Windows, macOS, Linux and Android.
const APP_EXTENSIONS = ['.exe', '.msi', '.msix', '.msixbundle', '.appx', '.appxbundle', '.zip', '.7z',
  '.dmg', '.pkg', '.deb', '.rpm', '.appimage', '.tar.gz', '.tgz', '.apk', '.aab', '.xapk'];

const KINDS = {
  icon:       { max: 2 * MB, types: IMAGE_TYPES, label: 'Icon' },
  banner:     { max: 5 * MB, types: IMAGE_TYPES, label: 'Banner' },
  screenshot: { max: 5 * MB, types: IMAGE_TYPES, label: 'Screenshot' },
  app_file:   { max: 4096 * MB, types: null, label: 'App file' },
};

const BLOB_HOST = /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/i;

function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function safeFilename(name) {
  const base = String(name || 'file').split(/[\\/]/).pop().normalize('NFKD');
  const cleaned = base.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/-+/g, '-').replace(/^[-.]+/, '');
  return (cleaned || 'file').slice(-120);
}

function hasAppExtension(name) {
  const n = String(name || '').toLowerCase();
  return APP_EXTENSIONS.some(ext => n.endsWith(ext));
}

class UploadError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// A one-hour token that lets this developer upload exactly one file of this kind, under their
// own folder, no larger than the kind allows.
async function createUploadToken({ userId, kind, filename, size, contentType }) {
  if (!blobConfigured()) throw new UploadError(503, 'Uploads are not available right now. Please try again later.');
  const spec = KINDS[kind];
  if (!spec) throw new UploadError(400, 'Unknown upload type');
  const bytes = Number(size);
  if (!Number.isFinite(bytes) || bytes <= 0) throw new UploadError(400, 'File is empty');
  if (bytes > spec.max) throw new UploadError(413, `${spec.label} is too large. Maximum is ${Math.round(spec.max / MB)} MB`);
  if (spec.types && !spec.types.includes(contentType)) throw new UploadError(400, `${spec.label} must be a PNG, JPEG, WebP or GIF image`);
  if (kind === 'app_file' && !hasAppExtension(filename)) {
    throw new UploadError(400, `App file type not supported. Use one of: ${APP_EXTENSIONS.join(', ')}`);
  }
  const pathname = `apps/${userId}/${kind}/${safeFilename(filename)}`;
  const token = await generateClientTokenFromReadWriteToken({
    token: process.env.BLOB_READ_WRITE_TOKEN,
    pathname,
    maximumSizeInBytes: spec.max,
    allowedContentTypes: spec.types || undefined,
    addRandomSuffix: true,
    validUntil: Date.now() + 60 * 60 * 1000,
    cacheControlMaxAge: 60 * 60 * 24 * 365, // files never change; new uploads get new names
  });
  return { token, pathname };
}

// Accept a submitted file URL only if it is this developer's own upload of this kind.
function ownUploadUrl(value, userId, kind) {
  if (typeof value !== 'string' || value.length > 2048) return null;
  let u;
  try { u = new URL(value); } catch { return null; }
  if (u.protocol !== 'https:' || !BLOB_HOST.test(u.hostname)) return null;
  if (!decodeURIComponent(u.pathname).startsWith(`/apps/${userId}/${kind}/`)) return null;
  u.search = ''; u.hash = '';
  return u.toString();
}

function isBlobUrl(value) {
  try { return BLOB_HOST.test(new URL(value).hostname); } catch { return false; }
}

// Best effort: a leftover file costs storage, never correctness.
async function removeUpload(url) {
  if (!url || !isBlobUrl(url) || !blobConfigured()) return;
  try { await del(url); } catch (e) { console.warn('Blob delete failed:', e.message); }
}

module.exports = { KINDS, APP_EXTENSIONS, UploadError, blobConfigured, createUploadToken, ownUploadUrl, isBlobUrl, removeUpload };
