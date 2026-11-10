// "Continue with Primers ID": swap a one-time code for who the person is.
// The code is single use, expires in 2 minutes and only works with the PKCE verifier created in the
// person's browser, so a leaked code alone is useless. Primers ID shares only name and verified email.

const ENDPOINT = 'https://atgqjrmcvpctywklfigb.supabase.co/rest/v1/rpc/primers_id_token';
// Publishable (public) key of the Primers ID project; it grants nothing on its own.
const PUBLISHABLE_KEY = 'sb_publishable_Im6hG4bodTfH4PtQvyHp1g_PcOO_6-p';

class PrimersIdError extends Error {}

async function exchangePrimersCode({ clientId, redirectUri, code, verifier }) {
  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json', apikey: PUBLISHABLE_KEY },
        body: JSON.stringify({ p_client_id: clientId, p_redirect_uri: redirectUri, p_code: code, p_verifier: verifier }),
        signal: AbortSignal.timeout(8000),
      });
      break;
    } catch (err) {
      // One retry on a network blip; a code that was already used fails safely.
      if (attempt === 1) throw new PrimersIdError('Primers ID is unreachable. Try again in a moment.');
    }
  }
  if (!res.ok) throw new PrimersIdError('That sign-in expired. Please try again.');
  const who = await res.json();
  if (!who || !who.sub || !who.email) throw new PrimersIdError('That sign-in expired. Please try again.');
  if (!who.email_verified) throw new PrimersIdError('Confirm your email on your Primers ID first, then try again.');
  return { sub: String(who.sub), email: String(who.email).toLowerCase(), name: String(who.name || '') };
}

module.exports = { exchangePrimersCode, PrimersIdError };
