import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { apiBase, AppRow, RowSkeleton, CATEGORIES } from '../components/AppBits';

const SORTS = [['downloads', 'Top downloads'], ['newest', 'Newest'], ['rating', 'Highest rated'], ['name', 'A to Z']];

export default function Store() {
  const [params, setParams] = useSearchParams();
  const [apps, setApps] = useState([]);
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const search = params.get('search') || '';
  const category = params.get('category') || '';
  const sort = params.get('sort') || 'downloads';
  const page = Math.max(1, parseInt(params.get('page') || '1', 10) || 1);
  const limit = 24;
  const [q, setQ] = useState(search);

  useEffect(() => { setQ(search); }, [search]);

  useEffect(() => {
    fetch(`${apiBase()}/apps/categories`).then(r => r.json())
      .then(d => setCounts(Object.fromEntries((d.categories || []).map(c => [c.category, c.count])))).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const p = new URLSearchParams({ limit, offset: (page - 1) * limit, sort });
    if (search) p.set('search', search);
    if (category) p.set('category', category);
    fetch(`${apiBase()}/apps?${p}`).then(r => r.json())
      .then(d => { setApps(d.apps || []); setTotal(d.total || 0); })
      .catch(() => { setApps([]); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search, category, sort, page]);

  const set = (key, value) => {
    const p = new URLSearchParams(params);
    if (value) p.set(key, value); else p.delete(key);
    if (key !== 'page') p.delete('page');
    setParams(p);
  };

  const pages = Math.ceil(total / limit);
  const title = search ? `Results for “${search}”` : category || 'All apps';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6" style={{ paddingTop: 32, paddingBottom: 72 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16 }}>
        <div>
          <p className="eyebrow">Apps</p>
          <h1 style={{ fontSize: 'clamp(1.75rem,3.5vw,2.5rem)', fontWeight: 700, margin: '6px 0 0' }}>{title}</h1>
          {!loading && <p style={{ color: 'var(--text-muted)', margin: '6px 0 0' }}>{total} app{total === 1 ? '' : 's'}</p>}
        </div>
        <form onSubmit={e => { e.preventDefault(); set('search', q.trim()); }} style={{ position: 'relative', width: 'min(100%,320px)' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps" maxLength={200} className="input-field" style={{ paddingLeft: 36, borderRadius: 12 }} />
        </form>
      </div>

      <div className="hscroll" style={{ gap: 8, marginTop: 22 }}>
        <button type="button" className="chip" aria-pressed={!category} onClick={() => set('category', '')}>All</button>
        {CATEGORIES.map(c => (
          <button key={c} type="button" className="chip" aria-pressed={category === c} onClick={() => set('category', category === c ? '' : c)}>
            {c}{counts[c] ? <span style={{ opacity: 0.6 }}>{counts[c]}</span> : null}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 18, borderBottom: '1px solid var(--border)' }}>
        {SORTS.map(([k, label]) => (
          <button key={k} type="button" onClick={() => set('sort', k)}
            style={{ padding: '10px 0', border: 0, background: 'none', cursor: 'pointer', fontSize: '0.9375rem', fontWeight: sort === k ? 600 : 400, color: sort === k ? 'var(--text-strong)' : 'var(--text-muted)', borderBottom: `2px solid ${sort === k ? 'var(--text-strong)' : 'transparent'}`, marginBottom: -1 }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', columnGap: 40, marginTop: 8 }}>
        {loading ? <RowSkeleton n={8} /> : apps.map((a, i) => <AppRow key={a.id} app={a} rank={sort === 'downloads' && !search && !category ? (page - 1) * limit + i + 1 : undefined} />)}
      </div>

      {!loading && apps.length === 0 && (
        <div style={{ textAlign: 'center', padding: '64px 0' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>No apps found</h2>
          <p style={{ color: 'var(--text-muted)' }}>Try another search or category.</p>
          {(search || category) && <button className="btn-secondary" style={{ marginTop: 12 }} onClick={() => setParams({})}>Show all apps</button>}
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 36 }}>
          <button className="btn-secondary btn-sm" disabled={page <= 1} onClick={() => set('page', String(page - 1))}><ChevronLeft size={16} /> Previous</button>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Page {page} of {pages}</span>
          <button className="btn-secondary btn-sm" disabled={page >= pages} onClick={() => set('page', String(page + 1))}>Next <ChevronRight size={16} /></button>
        </div>
      )}
    </div>
  );
}
