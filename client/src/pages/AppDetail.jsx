import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { StarRating } from '../components/ds/StarRating';
import { AppIcon, formatSize, formatCount, platformLabel } from '../components/AppBits';
import { Download, Globe, Mail, ShieldCheck, ChevronRight, Star, User, Copy } from 'lucide-react';
import toast from 'react-hot-toast';


export default function AppDetail() {
  const { slug } = useParams();
  const { user, apiRequest } = useAuth();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const progressIntervalRef = useRef(null);

  useEffect(() => () => { if (progressIntervalRef.current) clearInterval(progressIntervalRef.current); }, []);

  useEffect(() => {
    const base = window.__PRIMERS__?.apiUrl || '/api';
    fetch(`${base}/apps/${slug}`)
      .then(r => r.json())
      .then(data => setApp(data.app))
      .catch(() => toast.error('App not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleInstall = async () => {
    setInstalling(true);
    setInstallProgress(0);

    if (window.__PRIMERS__?.isElectron) {
      // Native desktop install via Electron IPC
      const removeProgress = window.__PRIMERS__.onProgress(({ slug: s, pct }) => {
        if (s === slug) setInstallProgress(pct);
      });
      const removeInstalled = window.__PRIMERS__.onInstalled(({ slug: s }) => {
        if (s !== slug) return;
        removeProgress();
        removeInstalled();
        removeError();
        setInstallProgress(100);
        toast.success(`${app.name} installed!`);
        setTimeout(() => {
          setInstalling(false);
          setInstallProgress(0);
          setApp(prev => ({ ...prev, is_installed: true }));
        }, 600);
      });
      const removeError = window.__PRIMERS__.onError(({ slug: s, error }) => {
        if (s !== slug) return;
        removeProgress();
        removeInstalled();
        removeError();
        toast.error(error || 'Installation failed');
        setInstalling(false);
        setInstallProgress(0);
      });

      const result = await window.__PRIMERS__.install({
        slug,
        name: app.name,
        version: app.latest_version?.version || '1.0.0',
        fileUrl: app.latest_version?.file_url || '',
      });

      if (result && !result.success) {
        // Error already emitted via onError, but clean up if not triggered
        removeProgress(); removeInstalled(); removeError();
        setInstalling(false);
        setInstallProgress(0);
      }
    } else {
      // Web browser: simulate progress + trigger download
      try {
        progressIntervalRef.current = setInterval(() => {
          setInstallProgress(prev => Math.min(prev + Math.random() * 30, 90));
        }, 300);

        // Signed-in users get the app in "My apps"; anyone can download.
        if (user) await apiRequest(`/apps/${slug}/install`, { method: 'POST' }).catch(() => {});

        // Track the download
        const base = window.__PRIMERS__?.apiUrl || '/api';
        fetch(`${base}/apps/${app.id}/download`, { method: 'POST' }).catch(() => {});

        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
        setInstallProgress(100);

        if (app.latest_version?.file_url) {
          let fileUrl = app.latest_version.file_url;
          // Files in Primers storage are served as an attachment so every browser saves them.
          try {
            const u = new URL(fileUrl, window.location.href);
            if (/\.public\.blob\.vercel-storage\.com$/.test(u.hostname)) { u.searchParams.set('download', '1'); fileUrl = u.toString(); }
          } catch { /* keep as is */ }
          const rawExt = fileUrl.split('?')[0].split('.').pop().toLowerCase();
          const safeExt = ['exe', 'msi', 'msix', 'appx', 'dmg', 'pkg', 'deb', 'rpm', 'appimage', 'apk', 'aab', 'xapk', 'zip', '7z', 'tar', 'gz', 'tgz'].includes(rawExt) ? rawExt : 'exe';
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = `${app.name}-${app.latest_version.version}.${safeExt}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        toast.success('Download started!');
        setTimeout(() => {
          setInstalling(false);
          setInstallProgress(0);
          if (user) setApp(prev => ({ ...prev, is_installed: true }));
        }, 500);
      } catch (e) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
        toast.error(e.message || 'Installation failed');
        setInstalling(false);
        setInstallProgress(0);
      }
    }
  };

  const handleUninstall = async () => {
    if (window.__PRIMERS__?.isElectron) {
      const result = await window.__PRIMERS__.uninstall({ slug, name: app.name });
      if (result.success) {
        toast.success('App uninstalled');
        setApp(prev => ({ ...prev, is_installed: false }));
      } else {
        toast.error(result.error || 'Uninstall failed');
      }
      return;
    }

    if (!user) return;
    try {
      await apiRequest(`/apps/${slug}/install`, { method: 'DELETE' });
      toast.success('App uninstalled');
      setApp(prev => ({ ...prev, is_installed: false }));
    } catch (e) {
      toast.error(e.message || 'Uninstall failed');
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    if (!user) return toast.error('Please sign in to review');
    setSubmitting(true);
    try {
      await apiRequest(`/apps/${slug}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating: reviewRating, title: reviewTitle, body: reviewText }),
      });
      toast.success('Review submitted!');
      setShowReviewForm(false);
      setReviewText(''); setReviewTitle(''); setReviewRating(5);
      // Refresh
      const base = window.__PRIMERS__?.apiUrl || '/api';
      const data = await fetch(`${base}/apps/${slug}`).then(r => r.json());
      setApp(data.app);
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 animate-pulse" style={{ paddingTop: 40 }}>
      <div style={{ display: 'flex', gap: 24 }}>
        <div style={{ width: 128, height: 128, borderRadius: '22.5%', background: '#f2f2f7' }} />
        <div style={{ flex: 1 }}><div style={{ height: 28, width: '40%', background: '#f2f2f7', borderRadius: 6 }} /><div style={{ height: 16, width: '60%', background: '#f5f5f7', borderRadius: 6, marginTop: 12 }} /></div>
      </div>
      <div style={{ height: 260, background: '#f5f5f7', borderRadius: 18, marginTop: 40 }} />
    </div>
  );
  if (!app) return (
    <div className="max-w-5xl mx-auto px-4" style={{ padding: '96px 16px', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>App not found</h1>
      <p style={{ color: 'var(--text-muted)', margin: '8px 0 20px' }}>It may have been removed or the link is mistyped.</p>
      <Link to="/store" className="btn-primary">Browse apps</Link>
    </div>
  );

  const v = app.latest_version;
  const size = formatSize(v?.file_size);
  const facts = [
    ['Rating', app.rating_count ? `${Number(app.rating_avg).toFixed(1)}` : '—', app.rating_count ? `${app.rating_count} rating${app.rating_count === 1 ? '' : 's'}` : 'No ratings'],
    ['Downloads', formatCount(app.downloads_count || 0), 'all time'],
    ['Size', size || '—', v ? `Version ${v.version}` : ''],
    ['Category', app.category, ''],
    ['Platform', platformLabel(v?.platform), v?.min_os_version ? `${v.min_os_version} or later` : ''],
  ];
  const copyHash = () => { navigator.clipboard?.writeText(v.file_hash).then(() => toast.success('Fingerprint copied')).catch(() => {}); };

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: 20 }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
          <Link to="/store" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Apps</Link>
          <ChevronRight size={14} />
          <Link to={`/store?category=${encodeURIComponent(app.category)}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>{app.category}</Link>
        </nav>

        {/* Header */}
        <header style={{ display: 'flex', gap: 'clamp(16px,3vw,32px)', alignItems: 'flex-start', padding: '24px 0 28px' }}>
          <div className="hidden sm:block"><AppIcon app={app} size={160} /></div>
          <div className="sm:hidden"><AppIcon app={app} size={96} /></div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 'clamp(1.625rem,3.5vw,2.375rem)', fontWeight: 700, margin: 0, lineHeight: 1.1 }}>{app.name}</h1>
            <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '1.0625rem' }}>{app.short_description}</p>
            <p style={{ margin: '6px 0 0', fontSize: '0.9375rem' }}><span style={{ color: 'var(--brand)' }}>{app.developer_display || app.developer_name}</span></p>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 14, marginTop: 18 }}>
              {app.is_installed && !installing ? (
                <>
                  <button onClick={handleInstall} className="btn-primary" style={{ height: 40, padding: '0 22px' }}><Download size={16} /> Download again</button>
                  <button onClick={handleUninstall} className="btn-secondary" style={{ height: 40 }}>Remove from my apps</button>
                </>
              ) : (
                <button onClick={handleInstall} disabled={installing || !v} className="btn-primary" style={{ height: 40, padding: '0 26px', fontSize: '0.9375rem', minWidth: 140 }}>
                  {installing ? `${Math.round(installProgress)}%` : <><Download size={16} /> {app.price > 0 ? `$${app.price.toFixed(2)}` : 'Download'}</>}
                </button>
              )}
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {app.price > 0 ? '' : 'Free'}{size ? ` · ${size}` : ''}{v ? ` · ${platformLabel(v.platform)}` : ''}
              </span>
            </div>
            {installing && (
              <div style={{ marginTop: 12, height: 4, borderRadius: 4, background: '#f2f2f7', overflow: 'hidden', maxWidth: 320 }}>
                <div style={{ height: '100%', width: `${installProgress}%`, background: 'var(--brand)', transition: 'width .3s' }} />
              </div>
            )}
          </div>
        </header>

        {/* Facts strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(120px,1fr))', overflowX: 'auto', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          {facts.map(([k, val, sub], i) => (
            <div key={k} style={{ textAlign: 'center', padding: '14px 8px', borderLeft: i ? '1px solid var(--border-soft)' : 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-subtle)' }}>{k}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{val}</div>
              {sub && <div style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', marginTop: 2 }}>{sub}</div>}
            </div>
          ))}
        </div>
      </div>

      {/* Screenshots */}
      {(app.screenshots?.length > 0 || app.banner_url) && (
        <section className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingTop: 32 }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 14px' }}>Preview</h2>
          <div className="hscroll" style={{ gap: 14 }}>
            {app.banner_url && <img src={app.banner_url} alt={`${app.name} banner`} style={{ height: 'clamp(200px,32vw,340px)', borderRadius: 18, border: '1px solid var(--border)', objectFit: 'cover' }} />}
            {app.screenshots?.map((shot, i) => (
              <img key={shot.id || i} src={shot.url} alt={shot.caption || `Screenshot ${i + 1}`} loading="lazy" style={{ height: 'clamp(200px,32vw,340px)', borderRadius: 18, border: '1px solid var(--border)', objectFit: 'cover' }} />
            ))}
          </div>
        </section>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6" style={{ paddingBottom: 72 }}>
        {/* Description */}
        <section style={{ paddingTop: 32 }}>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, color: 'var(--text-strong)', fontSize: '1rem', maxWidth: '72ch', margin: 0 }}>{app.description}</p>
        </section>

        {/* What's new */}
        {v && (
          <section style={{ paddingTop: 32, marginTop: 32, borderTop: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0 }}>What's new</h2>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Version {v.version}</span>
            </div>
            {v.changelog && <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-strong)', lineHeight: 1.6, margin: '10px 0 0', maxWidth: '72ch' }}>{v.changelog}</p>}
          </section>
        )}

        {/* Ratings & reviews */}
        <section style={{ paddingTop: 32, marginTop: 32, borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: 0 }}>Ratings & reviews</h2>
            {user && !showReviewForm && <button onClick={() => setShowReviewForm(true)} className="btn-secondary btn-sm"><Star size={14} /> Write a review</button>}
          </div>
          {app.rating_count > 0 && (
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 10 }}>
              <span style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>{Number(app.rating_avg).toFixed(1)}</span>
              <span style={{ color: 'var(--text-muted)' }}>out of 5 · {app.rating_count} rating{app.rating_count === 1 ? '' : 's'}</span>
            </div>
          )}

          {showReviewForm && (
            <form onSubmit={submitReview} style={{ marginTop: 18, padding: 20, borderRadius: 18, background: '#f5f5f7', display: 'grid', gap: 12, maxWidth: 640 }}>
              <StarRating rating={reviewRating} interactive onChange={setReviewRating} size="md" />
              <input type="text" placeholder="Title (optional)" value={reviewTitle} onChange={e => setReviewTitle(e.target.value)} className="input-field" maxLength={120} />
              <textarea placeholder="What do you think of this app?" value={reviewText} onChange={e => setReviewText(e.target.value)} rows={4} className="input-field" required maxLength={4000} />
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="submit" disabled={submitting} className="btn-primary btn-sm">{submitting ? 'Posting…' : 'Post review'}</button>
                <button type="button" onClick={() => setShowReviewForm(false)} className="btn-secondary btn-sm">Cancel</button>
              </div>
            </form>
          )}

          {app.reviews?.length > 0 ? (
            <div className="hscroll" style={{ gap: 14, marginTop: 18 }}>
              {app.reviews.map(review => (
                <article key={review.id} style={{ width: 'min(84vw,360px)', background: '#f5f5f7', borderRadius: 18, padding: '18px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <strong style={{ fontSize: '0.9375rem' }}>{review.title || 'Review'}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', whiteSpace: 'nowrap' }}>{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <StarRating rating={review.rating} size="sm" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)', display: 'inline-flex', alignItems: 'center', gap: 4 }}><User size={12} />{review.username}</span>
                  </div>
                  {review.body && <p style={{ fontSize: '0.875rem', lineHeight: 1.5, margin: '10px 0 0', color: 'var(--text-strong)' }}>{review.body}</p>}
                </article>
              ))}
            </div>
          ) : <p style={{ color: 'var(--text-muted)', marginTop: 10 }}>No reviews yet.{!user && <> <Link to="/login" style={{ color: 'var(--brand)' }}>Sign in</Link> to write the first one.</>}</p>}
        </section>

        {/* Information */}
        <section style={{ paddingTop: 32, marginTop: 32, borderTop: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1.375rem', fontWeight: 700, margin: '0 0 8px' }}>Information</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,240px),1fr))', columnGap: 32, margin: 0 }}>
            {[
              ['Developer', app.developer_display || app.developer_name],
              ['Size', size],
              ['Category', app.category],
              ['Platform', v ? `${platformLabel(v.platform)}${v.min_os_version ? ` ${v.min_os_version}+` : ''}` : null],
              ['Version', v?.version],
              ['Published', app.published_at ? new Date(app.published_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : null],
              ['Price', app.price > 0 ? `$${app.price.toFixed(2)}` : 'Free'],
            ].filter(([, val]) => val).map(([k, val]) => (
              <div key={k} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-soft)' }}>
                <dt style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{k}</dt>
                <dd style={{ margin: '2px 0 0', fontSize: '0.9375rem' }}>{val}</dd>
              </div>
            ))}
          </dl>

          <div style={{ marginTop: 18, padding: '16px 18px', borderRadius: 16, background: '#f5f5f7', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ShieldCheck size={22} color="var(--success)" style={{ flexShrink: 0, marginTop: 1 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Reviewed by Primers</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>This app and this version were checked by our team before publishing.</div>
              {v?.file_hash && (
                <button type="button" onClick={copyHash} title="Copy SHA-256" style={{ marginTop: 8, border: 0, background: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', maxWidth: '100%' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>SHA-256 {v.file_hash}</span><Copy size={12} style={{ flexShrink: 0 }} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 20, marginTop: 18, flexWrap: 'wrap' }}>
            {app.website && <a href={app.website} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Globe size={16} /> Developer website</a>}
            {app.support_email && <a href={`mailto:${app.support_email}`} style={{ color: 'var(--brand)', textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}><Mail size={16} /> App support</a>}
            {app.privacy_url && <a href={app.privacy_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand)', textDecoration: 'none' }}>Privacy policy</a>}
          </div>
        </section>
      </div>
    </div>
  );
}
