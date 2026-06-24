import { useState, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppCard3D from '../components/AppCard3D';
import Hero3DScene from '../components/Hero3DScene';
import ErrorBoundary from '../components/ErrorBoundary';
import { Upload, Shield, Download, Star, ArrowRight, Zap, Users } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [featuredApps, setFeaturedApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = window.__PRIMERS__?.apiUrl || '/api';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    fetch(`${base}/apps?sort=downloads&limit=6`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => setFeaturedApps(data.apps || []))
      .catch(() => setFeaturedApps([]))
      .finally(() => { clearTimeout(timeout); setLoading(false); });
  }, []);

  return (
    <div style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>

      {/* Hero */}
      <section style={{ position: 'relative', overflow: 'hidden' }}>
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}><Hero3DScene /></Suspense>
        </ErrorBoundary>
        <div className="dot-grid" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '-20%', left: '20%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(67,97,238,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '10%', right: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', maxWidth: '80rem', margin: '0 auto', padding: '5rem 1.5rem 6rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '3rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem', padding: '0.375rem 0.875rem', background: 'rgba(67,97,238,0.12)', border: '1px solid rgba(92,124,250,0.25)', borderRadius: 'var(--radius-full)' }}>
                <Shield size={13} color="var(--brand-text)" />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--brand-text)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Every App Verified</span>
              </div>
              <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', color: 'var(--text-strong)' }}>
                The App Store<br />
                <span className="glow-text">Built for Trust</span>
              </h1>
              <p style={{ marginTop: '1.5rem', fontFamily: 'var(--font-sans)', fontSize: '1.125rem', color: 'var(--text-muted)', lineHeight: 1.65, maxWidth: '32rem' }}>
                Every app on Primers goes through rigorous review before it reaches you. Quality and safety you can count on.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '2rem' }}>
                <Link to="/store" className="btn-primary" style={{ fontSize: '1rem', padding: '0.875rem 1.75rem' }}>Browse Apps</Link>
                <Link to={user ? '/developer/submit' : '/register'} className="btn-secondary" style={{ fontSize: '1rem', padding: '0.875rem 1.75rem' }}>Publish Your App</Link>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', inset: -20, background: 'radial-gradient(circle, rgba(67,97,238,0.20) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(20px)' }} />
                <img
                  src="/primers-mockup.jpg"
                  alt="Primers Store"
                  style={{ position: 'relative', maxWidth: '100%', width: 480, borderRadius: 'var(--radius-2xl)', boxShadow: '0 32px 64px rgba(0,0,0,0.6)', border: '1px solid var(--border)' }}
                  onError={e => { e.target.style.display = 'none'; }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--surface-sunken)' }}>
        <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem' }}>
            {[
              { icon: Shield, label: 'Every App Verified', color: '#34d399', bg: 'rgba(16,185,129,0.10)', bd: 'rgba(16,185,129,0.20)' },
              { icon: Zap, label: 'Always Free to Download', color: 'var(--brand-text)', bg: 'rgba(67,97,238,0.10)', bd: 'rgba(92,124,250,0.20)' },
              { icon: Users, label: 'Real Community Reviews', color: 'var(--violet-400)', bg: 'rgba(168,85,247,0.10)', bd: 'rgba(168,85,247,0.20)' },
            ].map(({ icon: Icon, label, color, bg, bd }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0.5rem 1rem', background: bg, border: `1px solid ${bd}`, borderRadius: 'var(--radius-full)' }}>
                <Icon size={15} color={color} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section style={{ maxWidth: '80rem', margin: '0 auto', padding: '5rem 1.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, color: 'var(--text-strong)' }}>Why Primers Store</h2>
          <p style={{ marginTop: '0.75rem', fontFamily: 'var(--font-sans)', color: 'var(--text-muted)' }}>A marketplace that puts quality first</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {[
            { icon: Shield, color: '#34d399', bg: 'rgba(16,185,129,0.12)', bd: 'rgba(16,185,129,0.20)', title: 'Verified Apps', desc: 'Every app is reviewed by our team before publishing. No malware, no surprises.' },
            { icon: Upload, color: 'var(--brand-text)', bg: 'rgba(67,97,238,0.12)', bd: 'rgba(92,124,250,0.20)', title: 'Easy Publishing', desc: 'Upload your app, set metadata, and submit for review. We handle distribution.' },
            { icon: Star, color: 'var(--violet-400)', bg: 'rgba(168,85,247,0.12)', bd: 'rgba(168,85,247,0.20)', title: 'Community Driven', desc: 'Ratings, reviews, and download counts help surface the best apps for everyone.' },
          ].map((f, i) => (
            <div key={i} className="card gradient-border" style={{ padding: '2rem', textAlign: 'center' }}>
              <div style={{ width: 52, height: 52, background: f.bg, border: `1px solid ${f.bd}`, borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                <f.icon size={24} color={f.color} />
              </div>
              <h3 style={{ margin: '1rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-strong)' }}>{f.title}</h3>
              <p style={{ margin: '0.5rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Apps */}
      {!loading && featuredApps.length > 0 && (
        <section style={{ background: 'var(--surface-sunken)', padding: '5rem 0' }}>
          <div style={{ maxWidth: '80rem', margin: '0 auto', padding: '0 1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <div>
                <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-strong)' }}>Popular Apps</h2>
                <p style={{ margin: '0.25rem 0 0', fontFamily: 'var(--font-sans)', fontSize: '0.875rem', color: 'var(--text-muted)' }}>Most downloaded on the store</p>
              </div>
              <Link to="/store" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-sans)', fontSize: '0.875rem', fontWeight: 600, color: 'var(--brand-text)', textDecoration: 'none' }}>
                View All <ArrowRight size={15} />
              </Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
              {featuredApps.map(app => <AppCard3D key={app.id} app={app} />)}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section style={{ background: 'linear-gradient(135deg, #1a1a3e 0%, #0d0d20 50%, #1a0d2e 100%)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 400, background: 'radial-gradient(ellipse, rgba(67,97,238,0.20) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '48rem', margin: '0 auto', padding: '5rem 1.5rem', textAlign: 'center' }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-strong)', lineHeight: 1.1 }}>Ready to Publish Your App?</h2>
          <p style={{ marginTop: '1rem', fontFamily: 'var(--font-sans)', fontSize: '1rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>Join developers distributing their apps on Primers Store. Submit for review and reach users directly.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.75rem', marginTop: '2rem' }}>
            <Link to={user ? '/developer/submit' : '/register'} className="btn-primary" style={{ fontSize: '1rem', padding: '0.875rem 1.75rem', gap: 8, display: 'inline-flex', alignItems: 'center' }}>
              <Upload size={18} /> Start Publishing
            </Link>
            <Link to="/store" className="btn-secondary" style={{ fontSize: '1rem', padding: '0.875rem 1.75rem', gap: 8, display: 'inline-flex', alignItems: 'center' }}>
              <Download size={18} /> Browse All Apps
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
