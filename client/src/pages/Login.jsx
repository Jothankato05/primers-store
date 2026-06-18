import { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
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
          <div className="w-14 h-14 bg-primer-600 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-8 h-8 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Welcome back</h1>
          <p className="text-gray-500 mt-1">Sign in to your Primers Store account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
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

          <p className="text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-primer-600 hover:text-primer-700 font-medium">Register</Link>
          </p>

          <div className="border-t border-gray-100 pt-4 mt-4">
            <p className="text-xs text-gray-400 text-center mb-2">Demo accounts:</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button type="button" onClick={() => { setEmail('admin@primers.store'); setPassword('admin123'); }} className="text-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="font-medium text-gray-700">Admin</div>
                <div className="text-gray-400">admin@primers</div>
              </button>
              <button type="button" onClick={() => { setEmail('dev@primers.store'); setPassword('dev123456'); }} className="text-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="font-medium text-gray-700">Developer</div>
                <div className="text-gray-400">dev@primers</div>
              </button>
              <button type="button" onClick={() => { setEmail('user@primers.store'); setPassword('user123456'); }} className="text-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="font-medium text-gray-700">User</div>
                <div className="text-gray-400">user@primers</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
