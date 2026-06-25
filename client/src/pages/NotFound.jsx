import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-7xl font-extrabold text-primer-600">404</p>
        <h1 className="mt-4 text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>Page not found</h1>
        <p className="mt-2 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
          The page you're looking for doesn't exist or may have been moved.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/" className="btn-primary flex items-center gap-2">
            <Home className="w-4 h-4" /> Go Home
          </Link>
          <Link to="/store" className="btn-secondary flex items-center gap-2">
            <Search className="w-4 h-4" /> Browse Apps
          </Link>
        </div>
      </div>
    </div>
  );
}
