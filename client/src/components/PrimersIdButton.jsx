import { useState } from 'react';
import { startPrimersSignIn } from '../lib/primersId';

export default function PrimersIdButton({ returnTo = '/', label = 'Continue with Primers ID' }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        setBusy(true);
        startPrimersSignIn('primers-store', returnTo).catch(() => setBusy(false));
      }}
      className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
      style={{ background: '#4D78FF' }}
    >
      <svg width="12" height="16" viewBox="0 0 14 18" aria-hidden="true" fill="currentColor">
        <path d="M0 0h8.5a5.5 5.5 0 0 1 0 11H4v7H0V0zm4 4v3h4.5a1.5 1.5 0 0 0 0-3H4z" />
      </svg>
      {busy ? 'Opening Primers ID…' : label}
    </button>
  );
}
