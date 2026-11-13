// Where to go after signing in. Only same-site paths, so ?next= can't send anyone elsewhere.
export function safeNext(search, fallback = '/') {
  const n = new URLSearchParams(search).get('next') || '';
  return /^\/(?![/\\])/.test(n) ? n : fallback;
}
