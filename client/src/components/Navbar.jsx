import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Search, User, Package, LogOut, Menu, X, Shield, Minus, Maximize2 } from 'lucide-react';

const isElectron = !!window.__PRIMERS__?.isElectron;
// In Electron (frameless window), interactive elements must opt out of the drag region
const drag = isElectron ? { WebkitAppRegion: 'drag' } : undefined;
const noDrag = isElectron ? { WebkitAppRegion: 'no-drag' } : undefined;

const linkStyle = ({ isActive }) => ({
  fontSize: '0.875rem', textDecoration: 'none', padding: '6px 2px',
  color: isActive ? 'var(--text-strong)' : 'var(--text-muted)', fontWeight: isActive ? 600 : 500,
});

export default function Navbar() {
  const { user, logout, isAdmin, isDeveloper } = useAuth();
  const navigate = useNavigate();
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

  const menuLink = { display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', fontSize: '0.875rem', color: 'var(--text-strong)', textDecoration: 'none' };

  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 50, background: 'rgba(255,255,255,0.82)', backdropFilter: 'saturate(180%) blur(20px)', WebkitBackdropFilter: 'saturate(180%) blur(20px)', borderBottom: '1px solid var(--border)', ...drag }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, height: 56 }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text-strong)', ...noDrag }}>
            <img src="/primers-mark.png" alt="" width="18" height="25" style={{ width: 18, height: 'auto' }} />
            <span style={{ fontWeight: 600, fontSize: '1.0625rem', letterSpacing: '-0.01em' }}>Primers Store</span>
          </Link>

          <div className="hidden md:flex" style={{ gap: 22, ...noDrag }}>
            <NavLink to="/" end style={linkStyle}>Discover</NavLink>
            <NavLink to="/store" style={linkStyle}>Apps</NavLink>
            <NavLink to="/store?sort=newest" style={() => linkStyle({ isActive: false })}>New</NavLink>
            <NavLink to={isDeveloper ? '/developer' : '/register'} style={linkStyle}>Developers</NavLink>
          </div>

          <form onSubmit={handleSearch} className="hidden md:block" style={{ marginLeft: 'auto', width: 260, ...noDrag }}>
            <label style={{ position: 'relative', display: 'block' }}>
              <span className="sr-only">Search apps</span>
              <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input type="search" placeholder="Search apps" value={search} onChange={e => setSearch(e.target.value)} maxLength={200}
                style={{ width: '100%', height: 34, padding: '0 12px 0 32px', borderRadius: 10, border: '1px solid transparent', background: '#f2f2f7', fontSize: '0.875rem', color: 'var(--text-strong)', outline: 'none' }}
                onFocus={e => { e.target.style.background = '#fff'; e.target.style.borderColor = 'var(--brand)'; }}
                onBlur={e => { e.target.style.background = '#f2f2f7'; e.target.style.borderColor = 'transparent'; }} />
            </label>
          </form>

          <div className="hidden md:flex" style={{ alignItems: 'center', gap: 12, ...noDrag }}>
            {user ? (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} aria-expanded={userMenuOpen}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 980, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer' }}>
                  <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#f2f2f7', display: 'grid', placeItems: 'center' }}><User size={14} color="var(--text-muted)" /></span>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--text-strong)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.display_name || user.username}</span>
                </button>
                {userMenuOpen && (
                  <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setUserMenuOpen(false)} />
                    <div style={{ position: 'absolute', right: 0, marginTop: 8, width: 240, background: '#fff', borderRadius: 14, border: '1px solid var(--border)', boxShadow: '0 12px 40px rgba(0,0,0,0.12)', padding: '6px 0', zIndex: 50 }}>
                      <div style={{ padding: '8px 14px 10px', borderBottom: '1px solid var(--border-soft)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{user.display_name || user.username}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.email}</div>
                      </div>
                      <Link to="/dashboard" style={menuLink} onClick={() => setUserMenuOpen(false)}><User size={15} /> My apps</Link>
                      {isDeveloper && <Link to="/developer" style={menuLink} onClick={() => setUserMenuOpen(false)}><Package size={15} /> Developer console</Link>}
                      {isAdmin && <Link to="/admin" style={menuLink} onClick={() => setUserMenuOpen(false)}><Shield size={15} /> Admin</Link>}
                      <button onClick={() => { logout(); setUserMenuOpen(false); }} style={{ ...menuLink, width: '100%', border: 0, background: 'none', cursor: 'pointer', color: 'var(--danger)', borderTop: '1px solid var(--border-soft)', marginTop: 4 }}>
                        <LogOut size={15} /> Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link to="/login" style={{ fontSize: '0.875rem', color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
            )}
            {isElectron && (
              <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4, paddingLeft: 8, borderLeft: '1px solid var(--border)' }}>
                <button onClick={() => window.__PRIMERS__.minimize()} title="Minimize" style={{ width: 30, height: 30, border: 0, background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Minus size={14} /></button>
                <button onClick={() => window.__PRIMERS__.maximize()} title="Maximize" style={{ width: 30, height: 30, border: 0, background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Maximize2 size={14} /></button>
                <button onClick={() => window.__PRIMERS__.close()} title="Close" style={{ width: 30, height: 30, border: 0, background: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14} /></button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, ...noDrag }} className="ml-auto md:ml-0">
            {/* Primers bar (apps + your Primers ID), filled in by id.primersgroup.ng/bar.js */}
            <span id="primers-bar-slot" style={{ display: 'flex', alignItems: 'center' }} />
            <span className="md:hidden">
              <button onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen}
                style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', border: 0, background: 'none', color: 'var(--text-strong)', cursor: 'pointer' }}>
                {menuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </span>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden" style={{ borderTop: '1px solid var(--border)', background: '#fff', padding: '12px 16px 18px', ...noDrag }}>
          <form onSubmit={handleSearch} style={{ marginBottom: 8 }}>
            <input type="search" placeholder="Search apps" value={search} onChange={e => setSearch(e.target.value)} maxLength={200} className="input-field" />
          </form>
          {[['/', 'Discover'], ['/store', 'Apps'], ['/store?sort=newest', 'New'], [isDeveloper ? '/developer' : '/register', 'Developers']].map(([to, label]) => (
            <Link key={label} to={to} onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-strong)', textDecoration: 'none', fontSize: '1rem' }}>{label}</Link>
          ))}
          {user ? (
            <>
              <Link to="/dashboard" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-strong)', textDecoration: 'none' }}>My apps</Link>
              {isAdmin && <Link to="/admin" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', borderBottom: '1px solid var(--border-soft)', color: 'var(--text-strong)', textDecoration: 'none' }}>Admin</Link>}
              <button onClick={() => { logout(); setMenuOpen(false); }} style={{ display: 'block', padding: '12px 0', border: 0, background: 'none', color: 'var(--danger)', fontSize: '1rem' }}>Sign out</button>
            </>
          ) : (
            <Link to="/login" onClick={() => setMenuOpen(false)} style={{ display: 'block', padding: '12px 0', color: 'var(--brand)', textDecoration: 'none', fontSize: '1rem' }}>Sign in</Link>
          )}
        </div>
      )}
    </nav>
  );
}
