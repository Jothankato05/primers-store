import { useState } from 'react';
import { Link, useNavigate, Navigate, useLocation } from 'react-router-dom';
import { safeNext } from '../lib/next';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import PrimersIdButton from '../components/PrimersIdButton';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const next = safeNext(useLocation().search);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to={next} replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate(next, { replace: true });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto' }}>
            <defs>
              <linearGradient id="loginLogoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#748ffc" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#loginLogoGrad)" />
            <text x="8" y="24" fontFamily="Quicksand, Manrope, sans-serif" fontWeight="700" fontSize="20" fill="white">P</text>
          </svg>
          <h1 className="mt-4 text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>Welcome back</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Sign in to your Primers Store account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <PrimersIdButton returnTo={next} />
          <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="h-px flex-1" style={{ background: 'var(--border, rgba(127,127,127,.25))' }} /> or with your Store password <span className="h-px flex-1" style={{ background: 'var(--border, rgba(127,127,127,.25))' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Don't have an account?{' '}
            <Link to={`/register${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="text-primer-400 hover:text-primer-300 font-medium">Register</Link>
          </p>


        </form>
      </div>
    </div>
  );
}
