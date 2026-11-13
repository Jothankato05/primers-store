import { Link } from 'react-router-dom';
import { ChevronRight, Star } from 'lucide-react';

export const apiBase = () => window.__PRIMERS__?.apiUrl || '/api';

export const CATEGORIES = [
  'Productivity', 'Development', 'Design', 'Games', 'Education', 'Business', 'Social',
  'Entertainment', 'Utilities', 'Security', 'Health & Fitness', 'Music', 'Photo & Video', 'Finance', 'Other',
];

export function formatSize(bytes) {
  if (!bytes) return null;
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function formatCount(n = 0) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}K`;
  return String(n);
}

export const platformLabel = (p) => ({ windows: 'Windows', macos: 'macOS', linux: 'Linux', android: 'Android', ios: 'iOS', web: 'Web' }[p] || 'Windows');

export function AppIcon({ app, size = 64 }) {
  return (
    <div className="app-icon" style={{ width: size, height: size }}>
      {app?.icon_url
        ? <img src={app.icon_url} alt="" loading="lazy" decoding="async" />
        : <span style={{ fontWeight: 700, fontSize: size * 0.42, color: 'var(--brand)' }}>{(app?.name || 'A').charAt(0)}</span>}
    </div>
  );
}

export function Rating({ value = 0, count = 0 }) {
  if (!count) return <span style={{ color: 'var(--text-subtle)' }}>No ratings yet</span>;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {Number(value).toFixed(1)} <Star size={12} fill="currentColor" strokeWidth={0} style={{ color: 'var(--text-muted)' }} />
    </span>
  );
}

export function Section({ title, subtitle, to, children, tight }) {
  return (
    <section style={{ padding: tight ? '20px 0' : '36px 0' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 16, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
        <div>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0, color: 'var(--text-strong)' }}>{title}</h2>
          {subtitle && <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9375rem' }}>{subtitle}</p>}
        </div>
        {to && (
          <Link to={to} style={{ color: 'var(--brand)', fontSize: '0.9375rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 2, whiteSpace: 'nowrap' }}>
            See all <ChevronRight size={16} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Compact list row: rank, icon, name, line, Get. Used in charts and search results. */
export function AppRow({ app, rank, showDivider = true }) {
  return (
    <Link to={`/store/${app.slug}`} style={{ display: 'grid', gridTemplateColumns: `${rank ? '28px ' : ''}64px 1fr auto`, alignItems: 'center', gap: 14, padding: '12px 0', textDecoration: 'none', color: 'inherit', borderBottom: showDivider ? '1px solid var(--border-soft)' : 'none' }}>
      {rank && <span style={{ fontWeight: 600, fontSize: '1.0625rem', color: 'var(--text-strong)', textAlign: 'center' }}>{rank}</span>}
      <AppIcon app={app} size={64} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.name}</div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{app.short_description || app.category}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 3, display: 'flex', gap: 8 }}>
          <span>{app.category}</span>
          {app.rating_count > 0 && <><span>·</span><Rating value={app.rating_avg} count={app.rating_count} /></>}
        </div>
      </div>
      <span className="get-btn">Get</span>
    </Link>
  );
}

/** Tile for horizontal rows: icon on top, name and category below. */
export function AppTile({ app }) {
  return (
    <Link to={`/store/${app.slug}`} style={{ width: 132, textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <AppIcon app={app} size={132} />
      <div style={{ marginTop: 10, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-strong)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.name}</div>
      <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{app.category}</div>
    </Link>
  );
}

export function RowSkeleton({ n = 4 }) {
  return [...Array(n)].map((_, i) => (
    <div key={i} style={{ display: 'grid', gridTemplateColumns: '64px 1fr', gap: 14, padding: '12px 0', alignItems: 'center' }} className="animate-pulse">
      <div style={{ width: 64, height: 64, borderRadius: '22.5%', background: '#f2f2f7' }} />
      <div><div style={{ height: 14, width: '50%', background: '#f2f2f7', borderRadius: 4 }} /><div style={{ height: 12, width: '75%', background: '#f5f5f7', borderRadius: 4, marginTop: 8 }} /></div>
    </div>
  ));
}
