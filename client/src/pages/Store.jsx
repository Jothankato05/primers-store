import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import AppCard3D from '../components/AppCard3D';
import { Search, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';

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
    <div key={i} className="bg-[#13131a] border border-white/10 rounded-xl p-5 animate-pulse">
      <div className="flex gap-4">
        <div className="w-14 h-14 bg-white/8 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-white/8 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-1/3" />
          <div className="h-3 bg-white/5 rounded w-full" />
          <div className="h-3 bg-white/5 rounded w-2/3" />
        </div>
      </div>
    </div>
  ));

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Primers Store</h1>
          <p className="text-white/50 mt-1">Browse verified apps — every app reviewed for quality and safety.</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search apps..."
              value={search}
              onChange={e => updateFilter('search', e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/20 bg-white/8 backdrop-blur-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primer-500 focus:border-transparent transition-all"
            />
          </div>
          <select
            value={category}
            onChange={e => updateFilter('category', e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-white/20 bg-white/8 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-primer-500 transition-all"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
            ))}
          </select>
          <select
            value={sort}
            onChange={e => updateFilter('sort', e.target.value)}
            className="px-4 py-2.5 rounded-lg border border-white/20 bg-white/8 backdrop-blur-sm text-white focus:outline-none focus:ring-2 focus:ring-primer-500 transition-all"
          >
            <option value="downloads">Most Downloaded</option>
            <option value="rating">Highest Rated</option>
            <option value="newest">Newest</option>
            <option value="name">Name A–Z</option>
          </select>
          {hasFilters && (
            <button
              onClick={() => setSearchParams({})}
              className="flex items-center gap-1 text-sm text-white/50 hover:text-white px-3 py-2 rounded-lg hover:bg-white/8 border border-white/10 transition-colors"
            >
              <X className="w-4 h-4" /> Clear
            </button>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{skeletonCards}</div>
        ) : apps.length === 0 ? (
          <div className="text-center py-20">
            <Filter className="w-12 h-12 text-white/20 mx-auto" />
            <h3 className="mt-4 text-lg font-semibold text-white/70">No apps found</h3>
            <p className="text-white/40 mt-1">Try adjusting your search or filters.</p>
            {hasFilters && (
              <button onClick={() => setSearchParams({})} className="mt-4 btn-secondary btn-sm">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <p className="text-sm text-white/40 mb-4">
              {total} app{total !== 1 ? 's' : ''} found
              {category && <span> in <strong className="text-white/60">{category}</strong></span>}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {apps.map(app => <AppCard3D key={app.id} app={app} />)}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-10">
                <button
                  onClick={() => updateFilter('page', String(page - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-white/8 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white/60 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => updateFilter('page', String(i + 1))}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      page === i + 1 ? 'bg-primer-600 text-white shadow-glow' : 'hover:bg-white/8 text-white/60 hover:text-white border border-white/10'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => updateFilter('page', String(page + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-white/8 border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-white/60 hover:text-white"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
