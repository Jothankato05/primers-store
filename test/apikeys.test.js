const test = require('node:test');
const assert = require('node:assert');
const { allowedForKey, looksLikeKey, checkKey } = require('../server/apiKeys');

const req = (method, path) => ({ method, path });
test('API keys reach only app and upload routes, within their permissions', () => {
  assert.equal(allowedForKey(req('GET', '/api/apps/mine'), ['store.read']), true);
  assert.equal(allowedForKey(req('POST', '/api/apps'), ['store.read']), false);
  assert.equal(allowedForKey(req('POST', '/api/apps'), ['store.publish']), true);
  assert.equal(allowedForKey(req('POST', '/api/uploads/token'), ['store.publish']), true);
  assert.equal(allowedForKey(req('GET', '/api/admin/stats'), ['store.publish']), false);
  assert.equal(allowedForKey(req('PATCH', '/api/auth/profile'), ['store.publish']), false);
  assert.equal(allowedForKey(req('GET', '/api/apps'), ['profile.read']), false);
});
test('malformed keys are refused without asking Primers ID', async () => {
  assert.equal(looksLikeKey('prm_live_x'), true);
  assert.deepEqual(await checkKey('prm_live_short'), { active: false });
});
