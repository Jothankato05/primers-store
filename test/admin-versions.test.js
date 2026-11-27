// Admin review of app versions: a version is only offered for download once
// approved, so the admin can approve or reject each one, and the app list says
// how many versions of each app wait for review. The database models are
// stubbed; the route handlers run as they do in the server.
const test = require('node:test');
const assert = require('node:assert');
const db = require('../server/database');
const router = require('../server/routes/admin');
const { requireAdmin } = require('../server/middleware/auth');

function handler(method, path) {
  const layer = router.stack.find(l => l.route && l.route.path === path && l.route.methods[method]);
  assert.ok(layer, `no ${method.toUpperCase()} ${path} route`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

function call(fn, req) {
  return new Promise((resolve, reject) => {
    const res = {
      code: 200,
      status(c) { this.code = c; return this; },
      json(body) { resolve({ code: this.code, body }); },
    };
    Promise.resolve(fn(req, res, reject)).catch(reject);
  });
}

test('every admin route, version review included, requires an admin', () => {
  const guards = router.stack.filter(l => !l.route).map(l => l.handle);
  assert.ok(guards.includes(requireAdmin));
  let code;
  const res = { status(c) { code = c; return this; }, json() {} };
  requireAdmin({ user: { role: 'developer' } }, res, () => assert.fail('a developer got through'));
  assert.equal(code, 403);
});

test('approving a version updates that version of that app and returns it', async (t) => {
  const seen = [];
  t.mock.method(db.AppVersion, 'findOneAndUpdate', async (filter, update, opts) => {
    seen.push({ filter, update, opts });
    return { toJSON: () => ({ id: 'v1', version: '1.0.0-rc1', status: update.status }) };
  });
  const review = handler('patch', '/apps/:id/versions/:versionId/review');
  const out = await call(review, { params: { id: 'a1', versionId: 'v1' }, body: { status: 'approved' } });
  assert.equal(out.code, 200);
  assert.equal(out.body.version.status, 'approved');
  assert.deepEqual(seen[0].filter, { _id: 'v1', app_id: 'a1' });
  assert.deepEqual(seen[0].update, { status: 'approved' });
  assert.equal(seen[0].opts.new, true);
});

test('a version of another app, or an unknown status, is refused', async (t) => {
  t.mock.method(db.AppVersion, 'findOneAndUpdate', async () => null);
  const review = handler('patch', '/apps/:id/versions/:versionId/review');
  const missing = await call(review, { params: { id: 'a2', versionId: 'v1' }, body: { status: 'approved' } });
  assert.equal(missing.code, 404);
  for (const status of ['pending', 'published', '', undefined]) {
    const bad = await call(review, { params: { id: 'a1', versionId: 'v1' }, body: { status } });
    assert.equal(bad.code, 400, `status ${status}`);
  }
});

test('the admin app list says how many versions of each app wait for review', async (t) => {
  const docs = [
    { _id: 'a1', toJSON: () => ({ id: 'a1', name: 'PRIMERS OS', developer_id: { id: 'u1', username: 'u', email: 'e' } }) },
    { _id: 'a2', toJSON: () => ({ id: 'a2', name: 'Other', developer_id: { id: 'u2', username: 'w', email: 'f' } }) },
  ];
  const chain = { sort() { return this; }, skip() { return this; }, limit() { return this; }, populate: async () => docs };
  t.mock.method(db.App, 'countDocuments', async () => docs.length);
  t.mock.method(db.App, 'find', () => chain);
  let match;
  t.mock.method(db.AppVersion, 'aggregate', async (pipeline) => {
    match = pipeline[0].$match;
    return [{ _id: 'a1', n: 1 }];
  });
  const list = handler('get', '/apps');
  const out = await call(list, { query: {} });
  assert.equal(match.status, 'pending');
  assert.deepEqual(match.app_id.$in, ['a1', 'a2']);
  assert.deepEqual(out.body.apps.map(a => [a.id, a.pending_versions]), [['a1', 1], ['a2', 0]]);
});

test('the "versions to review" filter lists apps of any status with a version waiting', async (t) => {
  let filter;
  const chain = { sort() { return this; }, skip() { return this; }, limit() { return this; }, populate: async () => [] };
  t.mock.method(db.AppVersion, 'distinct', async (field, query) => {
    assert.equal(field, 'app_id');
    assert.deepEqual(query, { status: 'pending' });
    return ['a1'];
  });
  t.mock.method(db.AppVersion, 'aggregate', async () => []);
  t.mock.method(db.App, 'countDocuments', async (f) => { filter = f; return 0; });
  t.mock.method(db.App, 'find', () => chain);
  const list = handler('get', '/apps');
  await call(list, { query: { status: 'versions_pending' } });
  assert.deepEqual(filter, { _id: { $in: ['a1'] } });
  await call(list, { query: { status: 'approved' } });
  assert.deepEqual(filter, { status: 'approved' });
});
