import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, ShieldCheck, Upload, Monitor, ChevronRight } from 'lucide-react';
import { apiBase, AppIcon, AppRow, AppTile, Section, RowSkeleton, CATEGORIES } from '../components/AppBits';

const API = apiBase();

export default function Home() {
  const navigate = useNavigate();
  const [top, setTop] = useState([]);
  const [fresh, setFresh] = useState([]);
  const [rated, setRated] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    const get = (p) => fetch(`${API}/apps?${p}`).then(r => r.json()).then(d => d.apps || []).catch(() => []);
    Promise.all([
      get('sort=downloads&limit=10'),
      get('sort=newest&limit=12'),
      get('sort=rating&limit=12'),
      fetch(`${API}/apps/categories`).then(r => r.json()).then(d => d.categories || []).catch(() => []),
    ]).then(([a, b, c, d]) => { setTop(a); setFresh(b); setRated(c); setCats(d); }).finally(() => setLoading(false));
  }, []);

  const featured = top[0];
  const counts = useMemo(() => Object.fromEntries(cats.map(c => [c.category, c.count])), [cats]);
  const go = (e) => { e.preventDefault(); if (q.trim()) navigate(`/store?search=${encodeURIComponent(q.trim())}`); };

  return (
    <div>
      {/* Intro + search */}
      <section style={{ background: '#f5f5f7', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6" style={{ paddingTop: 'clamp(40px,6vw,72px)', paddingBottom: 28 }}>
          <div style={{ maxWidth: 760 }}>
            <p className="eyebrow">Primers Store</p>
            <h1 style={{ fontSize: 'clamp(2.25rem,5vw,3.5rem)', lineHeight: 1.05, fontWeight: 700, margin: '10px 0 14px', color: 'var(--text-strong)' }}>
              Apps you can trust.<br /><span style={{ color: 'var(--text-muted)' }}>Reviewed before they reach you.</span>
            </h1>
            <form onSubmit={go} style={{ position: 'relative', maxWidth: 560, marginTop: 24 }}>
              <Search size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search apps, games and tools" maxLength={200}
                style={{ width: '100%', height: 52, borderRadius: 14, border: '1px solid var(--border-strong)', padding: '0 16px 0 46px', fontSize: '1rem', background: '#fff', outline: 'none', color: 'var(--text-strong)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--brand)'; e.target.style.boxShadow = '0 0 0 4px rgba(47,87,232,0.12)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border-strong)'; e.target.style.boxShadow = 'none'; }} />
            </form>
          </div>
          <div className="hscroll" style={{ gap: 8, marginTop: 22 }}>
            {CATEGORIES.map(c => (
              <Link key={c} to={`/store?category=${encodeURIComponent(c)}`} className="chip" style={{ background: '#fff', border: '1px solid var(--border)' }}>
                {c}{counts[c] ? <span style={{ color: 'var(--text-subtle)' }}>{counts[c]}</span> : null}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        {/* Featured */}
        {featured && (
          <section style={{ padding: '36px 0 8px' }}>
            <p className="eyebrow" style={{ color: 'var(--brand)' }}>Editor's choice</p>
            <Link to={`/store/${featured.slug}`} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', textDecoration: 'none', color: 'inherit', marginTop: 10, borderRadius: 22, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff' }}>
              <div style={{ position: 'relative', aspectRatio: '21 / 8', minHeight: 180, background: featured.banner_url ? `#111 url(${featured.banner_url}) center/cover` : 'linear-gradient(135deg,#1d2b6b,#2f57e8 60%,#6b8cff)' }}>
                {!featured.banner_url && <div className="hidden sm:block" style={{ position: 'absolute', right: '6%', top: '50%', transform: 'translateY(-50%)' }}><AppIcon app={featured} size={140} /></div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px' }}>
                <AppIcon app={featured} size={56} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '1.0625rem' }}>{featured.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{featured.short_description}</div>
                </div>
                <span className="get-btn">Get</span>
              </div>
            </Link>
          </section>
        )}

        {/* Top downloads: ranked, two columns */}
        <Section title="Top downloads" subtitle="What people are installing most" to="/store?sort=downloads">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))', columnGap: 40 }}>
            {loading ? <RowSkeleton n={4} /> : top.length ? top.slice(0, 8).map((a, i) => <AppRow key={a.id} app={a} rank={i + 1} />) : <Empty />}
          </div>
        </Section>

        {fresh.length > 0 && (
          <Section title="New releases" subtitle="Recently published and updated" to="/store?sort=newest">
            <div className="hscroll">{fresh.map(a => <AppTile key={a.id} app={a} />)}</div>
          </Section>
        )}

        {rated.some(a => a.rating_count > 0) && (
          <Section title="Highest rated" to="/store?sort=rating">
            <div className="hscroll">{rated.filter(a => a.rating_count > 0).map(a => <AppTile key={a.id} app={a} />)}</div>
          </Section>
        )}

        {/* Categories */}
        <Section title="Browse by category">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 10 }}>
            {CATEGORIES.map(c => (
              <Link key={c} to={`/store?category=${encodeURIComponent(c)}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 14, background: '#f5f5f7', textDecoration: 'none', color: 'var(--text-strong)', fontWeight: 500, fontSize: '0.9375rem' }}>
                {c} <ChevronRight size={16} color="var(--text-subtle)" />
              </Link>
            ))}
          </div>
        </Section>

        {/* Trust + developers + desktop */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))', gap: 16, padding: '36px 0 64px' }}>
          <Promo icon={ShieldCheck} title="Every app is checked" text="Our team reviews each app and every update before it goes live, and each file carries a fingerprint so you get exactly what the developer published." />
          <Promo icon={Upload} title="Publish your app" text="Upload installers up to 4 GB straight from your browser. We handle hosting and fast downloads." to="/developer/submit" cta="Start publishing" />
          <Promo icon={Monitor} title="Primers Store for Windows" text="Install and update apps in one click, without the browser." href={`${API}/download/desktop`} cta="Download" />
        </section>
      </div>
    </div>
  );
}

function Empty() {
  return <p style={{ color: 'var(--text-muted)', padding: '12px 0' }}>Apps will appear here as soon as they're approved.</p>;
}

function Promo({ icon: Icon, title, text, to, href, cta }) {
  const action = cta && (to
    ? <Link to={to} style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>{cta} ›</Link>
    : <a href={href} style={{ color: 'var(--brand)', textDecoration: 'none', fontWeight: 500 }}>{cta} ›</a>);
  return (
    <div style={{ background: '#f5f5f7', borderRadius: 20, padding: '26px 24px' }}>
      <Icon size={26} strokeWidth={1.6} color="var(--brand)" />
      <h3 style={{ margin: '14px 0 6px', fontSize: '1.125rem', fontWeight: 600 }}>{title}</h3>
      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9375rem', lineHeight: 1.5 }}>{text}</p>
      {action && <div style={{ marginTop: 14, fontSize: '0.9375rem' }}>{action}</div>}
    </div>
  );
}
