const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.BLOB_READ_WRITE_TOKEN = 'vercel_blob_rw_teststore123_abcdefghijklmnopqrstuvwxyz';
const { createUploadToken, ownUploadUrl, UploadError, isBlobUrl } = require('../server/storage');
const { getPayloadFromClientToken } = require('@vercel/blob/client');

const U = '64b7f0c2a1b2c3d4e5f60718';

test('issues a token scoped to the developer, kind and size limit', async () => {
  const { token, pathname } = await createUploadToken({ userId: U, kind: 'app_file', filename: 'My App Setup.exe', size: 1.6e9, contentType: 'application/x-msdownload' });
  assert.equal(pathname, `apps/${U}/app_file/My-App-Setup.exe`);
  const p = getPayloadFromClientToken(token);
  assert.equal(p.pathname, pathname);
  assert.equal(p.maximumSizeInBytes, 4096 * 1024 * 1024);
  assert.equal(p.addRandomSuffix, true);
  assert.ok(p.validUntil > Date.now());
});

test('rejects oversized files, wrong image types and unknown packages', async () => {
  await assert.rejects(createUploadToken({ userId: U, kind: 'app_file', filename: 'big.exe', size: 5e9 }), (e) => e instanceof UploadError && e.status === 413);
  await assert.rejects(createUploadToken({ userId: U, kind: 'icon', filename: 'i.svg', size: 1000, contentType: 'image/svg+xml' }), (e) => e.status === 400);
  await assert.rejects(createUploadToken({ userId: U, kind: 'app_file', filename: 'notes.txt', size: 10 }), (e) => e.status === 400);
  await assert.rejects(createUploadToken({ userId: U, kind: 'nope', filename: 'a.png', size: 10 }), (e) => e.status === 400);
  await assert.rejects(createUploadToken({ userId: U, kind: 'icon', filename: 'a.png', size: 0, contentType: 'image/png' }), (e) => e.status === 400);
});

test('path traversal in filenames stays inside the developer folder', async () => {
  const { pathname } = await createUploadToken({ userId: U, kind: 'screenshot', filename: '../../other/x.png', size: 100, contentType: 'image/png' });
  assert.equal(pathname, `apps/${U}/screenshot/x.png`);
});

test('accepts only this developer\'s own uploads of the right kind', () => {
  const good = `https://abc123.public.blob.vercel-storage.com/apps/${U}/icon/logo-x1y2.png`;
  assert.equal(ownUploadUrl(good, U, 'icon'), good);
  assert.equal(ownUploadUrl(good + '?download=1', U, 'icon'), good);
  assert.equal(ownUploadUrl(good, 'aaaaaaaaaaaaaaaaaaaaaaaa', 'icon'), null);
  assert.equal(ownUploadUrl(good, U, 'banner'), null);
  assert.equal(ownUploadUrl(`https://evil.example.com/apps/${U}/icon/logo.png`, U, 'icon'), null);
  assert.equal(ownUploadUrl(`http://abc123.public.blob.vercel-storage.com/apps/${U}/icon/l.png`, U, 'icon'), null);
  assert.equal(ownUploadUrl(`https://abc123.public.blob.vercel-storage.com/apps/${U}/icon/../../x/a.png`, U, 'icon'), null);
  assert.equal(ownUploadUrl(42, U, 'icon'), null);
  assert.equal(isBlobUrl(good), true);
  assert.equal(isBlobUrl('/uploads/icons/a.png'), false);
});
