import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-2 text-gray-500 text-sm">
            <span>© 2026 Primers Store</span>
            <span className="hidden sm:inline text-gray-300">|</span>
            <span>Your trusted marketplace for verified apps</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <Link to="/store" className="hover:text-gray-700 transition-colors">Browse Apps</Link>
            <Link to="/register" className="hover:text-gray-700 transition-colors">Sign Up</Link>
            <a
              href="mailto:primerscorperation@gmail.com"
              className="hover:text-gray-700 transition-colors"
            >
              Contact
            </a>
            <a
              href="https://github.com/Jothankato05/primers-store"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-700 transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
