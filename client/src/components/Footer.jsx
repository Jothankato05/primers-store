import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ background: 'var(--surface-sunken)', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            <span>© 2026 Primers Store</span>
            <span className="hidden sm:inline" style={{ color: 'var(--border-strong)' }}>|</span>
            <span>Your trusted marketplace for verified apps</span>
          </div>
          <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-muted)' }}>
            <Link to="/store" className="hover:text-white transition-colors">Browse Apps</Link>
            <Link to="/register" className="hover:text-white transition-colors">Sign Up</Link>
            <a href="mailto:primerscorperation@gmail.com" className="hover:text-white transition-colors">Contact</a>
            <a href="https://github.com/Jothankato05/primers-store" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
