import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { finishPrimersSignIn } from '../lib/primersId';

// Where Primers ID sends people back with a one-time code.
export default function PrimersReturn() {
  const { loginWithPrimers } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return; // a code works once
    ran.current = true;
    (async () => {
      try {
        const { code, verifier, returnTo } = finishPrimersSignIn();
        await loginWithPrimers(code, verifier);
        toast.success('Signed in with Primers ID');
        navigate(returnTo, { replace: true });
      } catch (err) {
        setError(err.message || "Couldn't sign you in");
      }
    })();
  }, [loginWithPrimers, navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="card p-6 w-full max-w-sm text-center">
        {error ? (
          <>
            <p className="font-semibold" style={{ color: 'var(--text-strong)' }}>Sign-in didn't finish</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
            <Link to="/login" className="btn-primary inline-block mt-5">Back to sign in</Link>
          </>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Signing you in with Primers ID…</p>
        )}
      </div>
    </div>
  );
}
