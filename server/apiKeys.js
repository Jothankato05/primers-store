// Primers API keys ("Authorization: Bearer prm_live_..."): checked with Primers ID, which answers
// with the key owner's Primers ID account number for the Store and the key's permissions.
// The Store authenticates itself with its own Primers ID client secret. Answers are cached for a
// minute (by a hash of the key, never the key itself) so a busy script doesn't hammer Primers ID.
const crypto = require('crypto');

const VERIFY_URL = process.env.PRIMERS_KEYS_URL || 'https://id.primersgroup.ng/api/keys/verify';
const CLIENT_ID = 'primers-store';
const KEY_RE = /^prm_(live|test)_[A-Za-z0-9]{20,64}$/;
const cache = new Map();
const TTL = 60 * 1000;

const looksLikeKey = (t) => typeof t === 'string' && t.startsWith('prm_');

async function checkKey(key) {
  if (!KEY_RE.test(key)) return { active: false };
  const secret = process.env.PRIMERS_ID_CLIENT_SECRET;
  if (!secret) return { active: false, unavailable: true };
  const id = crypto.createHash('sha256').update(key).digest('hex');
  const hit = cache.get(id);
  if (hit && hit.at > Date.now() - TTL) return hit.value;
  let value;
  try {
    const res = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Basic ' + Buffer.from(`${CLIENT_ID}:${secret}`).toString('base64') },
      body: JSON.stringify({ key }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error('Primers API key check failed with status', res.status);
      return { active: false, unavailable: true };
    }
    value = await res.json();
  } catch (err) {
    console.error('Primers API key check unreachable:', err.message);
    return { active: false, unavailable: true };
  }
  if (cache.size > 5000) cache.clear();
  cache.set(id, { at: Date.now(), value });
  return value;
}

// What an API key may reach: app and upload routes only, never accounts, sessions or admin.
function allowedForKey(req, scopes) {
  const p = (req.path || req.originalUrl || '').replace(/\/+$/, '');
  const m = req.method;
  const has = (x) => scopes.includes(x);
  if (m === 'GET' || m === 'HEAD') {
    const read = p === '/api/auth/me' || p === '/api/apps' || p === '/api/apps/categories' || p === '/api/apps/developer/mine'
      || /^\/api\/apps\/[^/]+(\/manage|\/reviews)?$/.test(p);
    return read && (has('store.read') || has('store.publish'));
  }
  // Writes: publishing only. Reviews, votes, installs and account changes need the person signed in.
  const publish = (m === 'POST' && (p === '/api/apps' || p === '/api/uploads/token' || /^\/api\/apps\/[^/]+\/versions$/.test(p)))
    || (m === 'PATCH' && /^\/api\/apps\/[^/]+$/.test(p));
  return publish && has('store.publish');
}

module.exports = { looksLikeKey, checkKey, allowedForKey };
