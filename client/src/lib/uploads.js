// Uploads go straight from the browser to storage: the API hands out a one-time token for
// each file, then the file streams to Vercel Blob in parallel parts (large files resume a
// failed part instead of starting over). The API never carries the file itself.
import { put } from '@vercel/blob/client';
import { createSHA256 } from 'hash-wasm';

const MB = 1024 * 1024;
export const APP_FILE_MAX = 4096 * MB;
export const IMAGE_MAX = { icon: 2 * MB, banner: 5 * MB, screenshot: 5 * MB };
export const APP_EXTENSIONS = ['.exe', '.msi', '.msix', '.msixbundle', '.appx', '.appxbundle', '.zip', '.7z',
  '.dmg', '.pkg', '.deb', '.rpm', '.appimage', '.tar.gz', '.tgz', '.apk', '.aab', '.xapk'];

const apiBase = () => window.__PRIMERS__?.apiUrl || '/api';

export function checkAppFile(file) {
  const name = file.name.toLowerCase();
  if (!APP_EXTENSIONS.some(ext => name.endsWith(ext))) return `That file type isn't supported. Use ${APP_EXTENSIONS.join(', ')}`;
  if (file.size > APP_FILE_MAX) return 'App files can be up to 4 GB';
  return null;
}

export function checkImage(file, kind) {
  if (!['image/png', 'image/jpeg', 'image/webp', 'image/gif'].includes(file.type)) return 'Images must be PNG, JPEG, WebP or GIF';
  if (file.size > IMAGE_MAX[kind]) return `${kind[0].toUpperCase() + kind.slice(1)} must be ${IMAGE_MAX[kind] / MB} MB or smaller`;
  return null;
}

/** Upload one file; returns its public URL. onProgress gets 0–100. */
export async function uploadFile(file, kind, { onProgress, signal } = {}) {
  const token = localStorage.getItem('primers_token');
  const res = await fetch(`${apiBase()}/uploads/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind, filename: file.name, size: file.size, contentType: file.type || 'application/octet-stream' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Could not start the upload');
  const blob = await put(data.pathname, file, {
    access: 'public',
    token: data.token,
    multipart: file.size > 20 * MB,
    contentType: file.type || 'application/octet-stream',
    abortSignal: signal,
    onUploadProgress: (e) => onProgress?.(Math.round(e.percentage)),
  });
  return blob.url;
}

/** SHA-256 of a file, read in chunks so even multi-GB installers don't fill memory. */
export async function sha256File(file, onProgress) {
  const hasher = await createSHA256();
  hasher.init();
  const CHUNK = 8 * MB;
  for (let offset = 0; offset < file.size; offset += CHUNK) {
    const part = new Uint8Array(await file.slice(offset, offset + CHUNK).arrayBuffer());
    hasher.update(part);
    onProgress?.(Math.round(Math.min(1, (offset + CHUNK) / file.size) * 100));
  }
  return hasher.digest('hex');
}

/** Upload an app package and fingerprint it at the same time. */
export async function uploadAppFile(file, { onProgress, signal } = {}) {
  const [url, sha256] = await Promise.all([uploadFile(file, 'app_file', { onProgress, signal }), sha256File(file)]);
  return { url, size: file.size, sha256 };
}
