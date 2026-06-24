import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppCard3D from '../components/AppCard3D';
import { Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

const inputStyle = {
  width: '100%',
  padding: '0.625rem 1rem 0.625rem 2.375rem',
  background: 'var(--surface-input)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-strong)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9375rem',
  outline: 'none',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  transition: 'border-color var(--duration) var(--ease), box-shadow var(--duration) var(--ease)',
};

const selectStyle = {
  padding: '0.625rem 1rem',
  background: 'var(--surface-input)',
  border: '1px solid var(--border-strong)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--text-body)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9375rem',
  outline: 'none',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  cursor: 'pointer',
};

export default function Store() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [apps, setApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'downloads';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = 12;

  useEffect(() => {
    const base = window.__PRIMERS__?.apiUrl || '/api';
    fetch(`${base}/apps/categories`).then(r => r.json()).then(d => setCategories(d.categories || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    const base = window.__PRIMERS__?.apiUrl || '/api';
    const params = new URLSearchParams({ limit, offset: (page - 1) * limit, sort });
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    fetch(`${base}/apps?${params}`)
      .then(r => r.json())
      .then(data => { setApps(data.apps || []); setTotal(data.total || 0); })
      .finally(() => setLoading(false));
  }, [search, category, sort, page]);

  const updateFilter = (key, value) => {
    const p = new URLSearchParams(searchParams);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.delete('page');
    setSearchParams(p);
  };

  const totalPages = Math.ceil(total / limit);
  const hasFilters = search || category;

  const skeletonCards = [...Array(6)].map((_, i) => (
    <div key={i} style={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }} className="animate-pulse">
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-lg)', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ height: 20, background: 'rgba(255,255,255,0.08)', borderRadius: 4, width: '75%' }} />
          <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 4, width: '33%' }} />
          <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 4, width: '100%' }} />
          <div style={{ height: 12, background: 'rgba(255,255,255,0.05)', borderRadius: 4, width: '66%' }} />
        </div>
      </div>
    </div>
  ));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-page)', fontFamily: 'var(--font-sans)' }}>
      <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-strong)', margin: 0 }}>Primers Store</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem', fontSize: '1rem' }}>Browse verified apps — every app reviewed for quality and safety.</p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Search apps..."
              value={search}
              onChange={e => updateFilter('search', e.target.value)}
              style={inputStyle}
              onFocus={e => { e.target.style.borderColor = 'var(--border-brand)'; e.target.style.boxShadow = '0 0 0 3px rgba(92,124,250,0.15)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }}
            />
          </div>

          <select
            value={category}
            onChange={e => updateFilter('category', e.target.value)}
            style={selectStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--border-brand)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; }}
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
            ))}
          </select>

          <select
            value={sort}
            onChange={e => updateFilter('sort', e.target.value)}
            style={selectStyle}
            onFocus={e => { e.target.style.borderColor = 'var(--border-brand)'; }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; }}
          >
            <option value="downloads">Most Downloaded</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
          </select>

          {hasFilters && (
            <button
              onClick={() => setSearchParams({})}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                padding: '0.5rem 0.75rem',
                background: 'none',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)', fontSize: '0.9375rem',
                cursor: 'pointer',
                transition: 'color var(--duration) var(--ease), background var(--duration) var(--ease)',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-strong)'; e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'none'; }}
            >
              <X size={16} /> Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="store-apps-grid">{skeletonCards}</div>
        ) : apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 0' }}>
            <Filter size={48} style={{ color: 'var(--text-subtle)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-muted)', margin: 0 }}>No apps found</h3>
            <p style={{ color: 'var(--text-subtle)', marginTop: '0.25rem' }}>Try adjusting your search or filters.</p>
            {hasFilters && (
              <button onClick={() => setSearchParams({})} className="btn-secondary btn-sm" style={{ marginTop: '1rem' }}>Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-subtle)', marginBottom: '1rem' }}>
              {total} app{total !== 1 ? 's' : ''} found
              {category && <span> in <strong style={{ color: 'var(--text-muted)' }}>{category}</strong></span>}
            </p>
            <div className="store-apps-grid">
              {apps.map(app => <AppCard3D key={app.id} app={app} />)}
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: '2.5rem' }}>
                <button
                  onClick={() => updateFilter('page', String(page - 1))}
                  disabled={page === 1}
                  style={{
                    padding: 8, borderRadius: 'var(--radius-md)',
                    background: 'none', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: page === 1 ? 'not-allowed' : 'pointer',
                    opacity: page === 1 ? 0.3 : 1,
                    transition: 'background var(--duration) var(--ease)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <ChevronLeft size={20} />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateFilter('page', String(i + 1))}
                    style={{
                      width: 36, height: 36,
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.875rem', fontWeight: 500,
                      cursor: 'pointer',
                      background: page === i + 1 ? 'var(--brand)' : 'none',
                      color: page === i + 1 ? '#fff' : 'var(--text-muted)',
                      border: page === i + 1 ? '1px solid transparent' : '1px solid var(--border)',
                      boxShadow: page === i + 1 ? 'var(--glow)' : 'none',
                      fontFamily: 'var(--font-sans)',
                      transition: 'background var(--duration) var(--ease), color var(--duration) var(--ease)',
                    }}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => updateFilter('page', String(page + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: 8, borderRadius: 'var(--radius-md)',
                    background: 'none', border: '1px solid var(--border)',
                    color: 'var(--text-muted)', cursor: page === totalPages ? 'not-allowed' : 'pointer',
                    opacity: page === totalPages ? 0.3 : 1,
                    transition: 'background var(--duration) var(--ease)',
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .store-apps-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1rem;
        }
        @media (min-width: 768px) {
          .store-apps-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
          .store-apps-grid { grid-template-columns: repeat(3, 1fr); }
        }
      `}</style>
    </div>
  );
}
