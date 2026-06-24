import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { StarRating } from './ds/StarRating.jsx';
import { Badge } from './ds/Badge.jsx';

function fmt(n) {
  if (n == null) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

const DownloadIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);
const MonitorIcon = () => (
  <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

export default function AppCard3D({ app }) {
  const cardRef = useRef();
  const [hover, setHover] = useState(false);
  const [glow, setGlow] = useState({ x: 50, y: 50 });
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = (e) => {
    const r = cardRef.current?.getBoundingClientRect();
    if (!r) return;
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    setGlow({ x: (x / r.width) * 100, y: (y / r.height) * 100 });
    setTilt({ x: ((y - r.height / 2) / r.height) * -8, y: ((x - r.width / 2) / r.width) * 8 });
  };

  const onLeave = () => {
    setHover(false);
    setTilt({ x: 0, y: 0 });
    setGlow({ x: 50, y: 50 });
  };

  const { name = 'App', developer_name, icon_url, short_description, description,
    rating_avg = 0, rating_count = 0, downloads_count = 0, price = 0,
    latest_version, category, slug } = app;

  const platform = latest_version?.platform || 'Windows';

  return (
    <Link
      to={`/store/${slug}`}
      ref={cardRef}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onLeave}
      onMouseMove={onMove}
      style={{ display: 'block', textDecoration: 'none', perspective: '1000px' }}
    >
      <div style={{
        position: 'relative', overflow: 'hidden',
        background: 'var(--surface-card)',
        border: `1px solid ${hover ? 'var(--border-brand)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '1.25rem',
        boxShadow: hover ? '0 8px 32px rgba(67,97,238,0.15)' : 'var(--shadow-card)',
        transform: hover
          ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale(1.02)`
          : 'rotateX(0) rotateY(0) scale(1)',
        transformStyle: 'preserve-3d',
        transition: 'border-color 300ms, box-shadow 300ms, transform 300ms',
      }}>
        {/* shimmer top line */}
        <div style={{
          position: 'absolute', insetInline: 0, top: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(92,124,250,0.4), transparent)',
          opacity: hover ? 1 : 0, transition: 'opacity 300ms',
        }} />
        {/* cursor glow */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          opacity: hover ? 1 : 0, transition: 'opacity 300ms',
          background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(92,124,250,0.12) 0%, transparent 60%)`,
        }} />

        <div style={{ display: 'flex', gap: '1rem', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 56, height: 56, flexShrink: 0,
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, var(--primer-500), var(--primer-700))',
            boxShadow: hover ? 'var(--glow)' : 'var(--shadow-md)',
            color: '#fff', fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 22,
            transition: 'box-shadow 300ms',
          }}>
            {icon_url
              ? <img src={icon_url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : name.charAt(0).toUpperCase()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{
              margin: 0, fontFamily: 'var(--font-sans)', fontSize: '1rem',
              fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              color: hover ? 'var(--brand-text)' : 'var(--text-strong)',
              transition: 'color 300ms',
            }}>{name}</h3>
            {developer_name && (
              <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
                {developer_name}
              </p>
            )}
            <div style={{ marginTop: 6 }}>
              <StarRating rating={rating_avg} count={rating_count} size="sm" />
            </div>
            {(short_description || description) && (
              <p style={{
                margin: '8px 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.875rem',
                color: 'var(--text-muted)', lineHeight: 1.5,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>{short_description || description}</p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><MonitorIcon />{platform}</span>
              {price > 0
                ? <span style={{ fontWeight: 600, color: 'var(--brand-text)' }}>${Number(price).toFixed(2)}</span>
                : <span style={{ fontWeight: 600, color: '#34d399' }}>Free</span>}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}><DownloadIcon />{fmt(downloads_count)}</span>
            </div>
            {category && (
              <div style={{ marginTop: '0.5rem' }}>
                <Badge tone="neutral" size="sm">{category}</Badge>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
