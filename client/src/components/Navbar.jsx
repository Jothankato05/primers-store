import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, User, Package, LogOut, Menu, X, Shield, Minus, Maximize2 } from 'lucide-react';

const isElectron = !!window.__PRIMERS__?.isElectron;

// In Electron (frameless window), interactive elements must opt out of the drag region
const drag = isElectron ? { WebkitAppRegion: 'drag' } : undefined;
const noDrag = isElectron ? { WebkitAppRegion: 'no-drag' } : undefined;

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
    <nav className="bg-black/40 backdrop-blur-xl border-b border-white/10 sticky top-0 z-50" style={drag}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0" style={noDrag}>
            <img src="/primers-logo.svg" alt="Primers" style={{ height: 32 }} onError={e => { e.target.style.display='none'; }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.125rem', background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Primers</span>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-8" style={noDrag}>
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Search apps..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/10 backdrop-blur-sm text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primer-500 focus:border-transparent transition-all"
                maxLength={200}
              />
            </div>
          </form>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-4" style={noDrag}>
            <Link
              to="/store"
              className={`text-sm font-medium transition-colors ${isActive('/store') ? 'text-primer-400' : 'text-white/70 hover:text-white'}`}
            >
              Store
            </Link>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="w-8 h-8 bg-primer-600/30 border border-primer-500/40 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primer-400" />
                  </div>
                  <span className="text-sm font-medium text-white/80">{user.display_name || user.username}</span>
                </button>

                {userMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-[#13131a]/95 backdrop-blur-xl rounded-xl shadow-2xl border border-white/10 py-2 z-50">
                      <div className="px-4 py-2 border-b border-white/10">
                        <p className="font-medium text-sm text-white">{user.display_name || user.username}</p>
                        <p className="text-xs text-white/50">{user.email}</p>
                        <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primer-600/20 text-primer-400 font-medium capitalize border border-primer-500/20">
                          {user.role}
                        </span>
                      </div>
                      <Link to="/dashboard" className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors" onClick={() => setUserMenuOpen(false)}>
                        <User className="w-4 h-4" /> My Dashboard
                      </Link>
                      {isDeveloper && (
                        <Link to="/developer" className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors" onClick={() => setUserMenuOpen(false)}>
                          <Package className="w-4 h-4" /> Developer Console
                        </Link>
                      )}
                      {isAdmin && (
                        <Link to="/admin" className="flex items-center gap-2 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors" onClick={() => setUserMenuOpen(false)}>
                          <Shield className="w-4 h-4" /> Admin Panel
                        </Link>
                      )}
                      <hr className="my-1 border-white/10" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); }}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 w-full transition-colors"
                      >
                        <LogOut className="w-4 h-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/login" className="text-sm font-medium text-white/70 hover:text-white transition-colors">Sign In</Link>
                <Link to="/register" className="btn-primary btn-sm">Register</Link>
              </div>
            )}

            {/* Electron window controls */}
            {isElectron && (
              <div className="flex items-center ml-2 pl-2 border-l border-white/10">
                <button
                  onClick={() => window.__PRIMERS__.minimize()}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  title="Minimize"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => window.__PRIMERS__.maximize()}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                  title="Maximize"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => window.__PRIMERS__.close()}
                  className="w-8 h-8 flex items-center justify-center rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                  title="Close"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors" style={noDrag} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-white/10 bg-black/60 backdrop-blur-xl px-4 py-3 space-y-2" style={noDrag}>
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input type="text" placeholder="Search apps..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 rounded-lg border border-white/20 bg-white/10 text-white text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primer-500" maxLength={200} />
            </div>
          </form>
          <Link to="/store" className={`block py-2 text-sm font-medium ${isActive('/store') ? 'text-primer-400' : 'text-white/70'}`} onClick={() => setMenuOpen(false)}>Store</Link>
          {user ? (
            <>
              <Link to="/dashboard" className={`block py-2 text-sm font-medium ${isActive('/dashboard') ? 'text-primer-400' : 'text-white/70'}`} onClick={() => setMenuOpen(false)}>Dashboard</Link>
              {isDeveloper && <Link to="/developer" className={`block py-2 text-sm font-medium ${isActive('/developer') ? 'text-primer-400' : 'text-white/70'}`} onClick={() => setMenuOpen(false)}>Developer Console</Link>}
              {isAdmin && <Link to="/admin" className={`block py-2 text-sm font-medium ${isActive('/admin') ? 'text-primer-400' : 'text-white/70'}`} onClick={() => setMenuOpen(false)}>Admin Panel</Link>}
              {isElectron && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button onClick={() => window.__PRIMERS__.minimize()} className="flex-1 py-2 text-sm text-center text-white/60 hover:bg-white/5 rounded">Minimize</button>
                  <button onClick={() => window.__PRIMERS__.close()} className="flex-1 py-2 text-sm text-center text-red-400 hover:bg-red-500/10 rounded">Close</button>
                </div>
              )}
              <button onClick={() => { logout(); setMenuOpen(false); }} className="block py-2 text-sm font-medium text-red-400">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block py-2 text-sm font-medium text-white/70" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" className="block py-2 text-sm font-medium text-primer-400" onClick={() => setMenuOpen(false)}>Register</Link>
              {isElectron && (
                <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                  <button onClick={() => window.__PRIMERS__.minimize()} className="flex-1 py-2 text-sm text-center text-white/60 hover:bg-white/5 rounded">Minimize</button>
                  <button onClick={() => window.__PRIMERS__.close()} className="flex-1 py-2 text-sm text-center text-red-400 hover:bg-red-500/10 rounded">Close</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </nav>
  );
}
