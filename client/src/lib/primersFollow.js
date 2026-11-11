// Keeps this app on the same account as the Primers bar, the way Google apps follow your Google
// Account. The bar (id.primersgroup.ng/bar.js) reports the Primers ID state on window:
//   - you picked another account in the bar's menu  -> sign in to this app as that account
//   - you signed out of Primers ID                   -> sign out here too, but only if you came in
//                                                       with Primers ID (a password sign-in is left alone)
const LINKED = 'primers-id-linked';

/** Call after a successful "Continue with Primers ID" sign-in (true) and on sign-out (false). */
export function markPrimersLinked(on) {
  try { if (on) localStorage.setItem(LINKED, '1'); else localStorage.removeItem(LINKED); } catch { /* private mode */ }
}

/**
 * isSignedIn(): is someone signed in to this app right now
 * signIn():     start "Continue with Primers ID" (returns here signed in as the bar's account);
 *               null to stay put when the person switches accounts
 * signOut():    sign out of this app
 * Returns a function that stops following.
 */
export function followPrimersId({ isSignedIn, signIn, signOut }) {
  let acting = false;
  const handle = (d) => {
    if (!d || acting) return;
    if (d.switched) { if (signIn) { acting = true; signIn(); } return; }
    let linked = false;
    try { linked = localStorage.getItem(LINKED) === '1'; } catch { /* ignore */ }
    if (!d.signedIn && linked && isSignedIn()) { acting = true; markPrimersLinked(false); signOut(); }
  };
  const onAccount = (e) => handle(e.detail);
  window.addEventListener('primers:account', onAccount);
  if (window.primersBarState) handle(window.primersBarState);
  return () => window.removeEventListener('primers:account', onAccount);
}
