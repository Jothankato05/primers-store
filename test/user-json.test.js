const test = require('node:test');
const assert = require('node:assert');
const { User } = require('../server/database');

test('user JSON never carries the password hash or link ids', () => {
  const u = new User({ username: 'a', email: 'a@b.c', password_hash: 'secret', primers_id_sub: 'x', verification_token: 't' });
  const j = u.toJSON();
  assert.equal(j.password_hash, undefined);
  assert.equal(j.primers_id_sub, undefined);
  assert.equal(j.verification_token, undefined);
  assert.equal(j.email, 'a@b.c');
});
