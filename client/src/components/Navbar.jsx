import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, User, Package, Settings, LogOut, Menu, X, Shield, PlusCircle } from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAdmin, isDeveloper } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/store?search=${encodeURIComponent(search.trim())}`);
      setMenuOpen(false);
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img src="/primers-logo.svg" alt="Primers" className="h-10" />
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search apps..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-10 py-2 text-sm"
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              to="/store"
              className={`text-sm font-medium transition-colors ${isActive('/store') ? 'text-primer-600' : 'text-gray-600 hover:text-gray-900'}`}
            >
              Store
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-primer-100 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primer-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user.display_name || user.username}</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-medium text-sm">{user.display_name || user.username}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primer-100 text-primer-700 font-medium capitalize">
                          {user.role}
                        </span>
                      </div>
                      <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                        <User className="w-4 h-4" /> My Dashboard
                      </Link>
                      {isDeveloper && (
                        <Link to="/developer" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                          <Package className="w-4 h-4" /> Developer Console
                        </Link>
                      )}
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50" onClick={() => setUserMenuOpen(false)}>
                          <Shield className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
                <Link to="/register" className="btn-primary btn-sm">Register</Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-gray-100" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search apps..." value={search} onChange={e => setSearch(e.target.value)} className="input-field pl-10 py-2 text-sm" />
            </div>
          </form>
          <Link to="/store" className={`block py-2 text-sm font-medium ${isActive('/store') ? 'text-primer-600' : 'text-gray-700'}`} onClick={() => setMenuOpen(false)}>Store</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={`block py-2 text-sm font-medium ${isActive('/dashboard') ? 'text-primer-600' : 'text-gray-700'}`} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              {isDeveloper && <Link to="/developer" className={`block py-2 text-sm font-medium ${isActive('/developer') ? 'text-primer-600' : 'text-gray-700'}`} onClick={() => setMenuOpen(false)}>Developer Console</Link>}
              {isAdmin && <Link to="/admin" className={`block py-2 text-sm font-medium ${isActive('/admin') ? 'text-primer-600' : 'text-gray-700'}`} onClick={() => setMenuOpen(false)}>Admin Panel</Link>}
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block py-2 text-sm font-medium text-red-600">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" className="block py-2 text-sm font-medium text-primer-600" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
