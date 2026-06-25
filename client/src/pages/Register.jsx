import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Register() {
  const { user, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', displayName: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (form.password.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }
    setLoading(true);
    try {
      await register(form.username, form.email, form.password, form.displayName);
      toast.success('Account created! Welcome to Primers Store.');
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto' }}>
            <defs>
              <linearGradient id="regLogoGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#748ffc" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
            <rect width="32" height="32" rx="8" fill="url(#regLogoGrad)" />
            <text x="8" y="24" fontFamily="Quicksand, Manrope, sans-serif" fontWeight="700" fontSize="20" fill="white">P</text>
          </svg>
          <h1 className="mt-4 text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>Create your account</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Join Primers Store and start discovering apps</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input type="text" value={form.username} onChange={update('username')} className="input-field pl-10" placeholder="johndoe" required minLength={3} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>Display Name</label>
            <input type="text" value={form.displayName} onChange={update('displayName')} className="input-field" placeholder="John Doe (optional)" />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input type="email" value={form.email} onChange={update('email')} className="input-field pl-10" placeholder="you@example.com" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input type="password" value={form.password} onChange={update('password')} className="input-field pl-10" placeholder="At least 8 characters" required minLength={8} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-body)' }}>Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input type="password" value={form.confirmPassword} onChange={update('confirmPassword')} className="input-field pl-10" placeholder="Repeat your password" required />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link to="/login" className="text-primer-400 hover:text-primer-300 font-medium">Sign In</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
