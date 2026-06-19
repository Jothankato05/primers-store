import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { Download, Globe, Mail, Shield, Monitor, Smartphone, Apple, Calendar, User, ChevronRight, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import toast from 'react-hot-toast';

const platformIcons = { windows: Monitor, macos: Apple, linux: Monitor, android: Smartphone, ios: Smartphone, web: Globe };

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
    if (!user && !window.__PRIMERS__?.isElectron) {
      toast.error('Please sign in to install');
      return;
    }

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

        await apiRequest(`/apps/${slug}/install`, { method: 'POST' });

        // Track the download
        const base = window.__PRIMERS__?.apiUrl || '/api';
        fetch(`${base}/apps/${app.id}/download`, { method: 'POST' }).catch(() => {});

        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
        setInstallProgress(100);

        if (app.latest_version?.file_url) {
          const fileUrl = app.latest_version.file_url;
          const rawExt = fileUrl.split('.').pop().split('?')[0].toLowerCase();
          const safeExt = ['exe', 'dmg', 'deb', 'rpm', 'apk', 'zip', 'tar', 'gz', 'msi'].includes(rawExt) ? rawExt : 'exe';
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
          setApp(prev => ({ ...prev, is_installed: true }));
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
    <div className="min-h-screen bg-[#0a0a0f] max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-4 bg-white/8 rounded w-48" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-5">
              <div className="w-24 h-24 bg-white/8 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-7 bg-white/8 rounded w-2/3" />
                <div className="h-4 bg-white/5 rounded w-1/3" />
                <div className="h-4 bg-white/5 rounded w-1/4" />
              </div>
            </div>
            <div className="h-48 bg-white/5 rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-full" />
              <div className="h-4 bg-white/5 rounded w-3/4" />
            </div>
          </div>
          <div className="h-64 bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  );
  if (!app) return (
    <div className="min-h-screen bg-[#0a0a0f] max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Download className="w-8 h-8 text-white/30" />
      </div>
      <h2 className="text-2xl font-bold text-white">App not found</h2>
      <p className="text-white/50 mt-2 mb-6">This app doesn't exist or may have been removed.</p>
      <Link to="/store" className="btn-primary">Back to Store</Link>
    </div>
  );

  const PlatformIcon = platformIcons[app.latest_version?.platform] || Monitor;

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-white/40 mb-6">
          <Link to="/store" className="hover:text-white/70 transition-colors">Store</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-white/70 font-medium">{app.name}</span>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div className="flex items-start gap-5">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primer-500 to-primer-700 flex items-center justify-center shrink-0 overflow-hidden shadow-2xl shadow-primer-500/30 ring-2 ring-primer-500/20">
                {app.icon_url ? (
                  <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white font-bold text-3xl">{app.name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{app.name}</h1>
                <p className="text-white/50 mt-1">by {app.developer_display || app.developer_name}</p>
                <div className="flex items-center gap-3 mt-2">
                  <StarRating rating={app.rating_avg} count={app.rating_count} size="md" />
                  <span className="text-sm text-white/30">|</span>
                  <span className="text-sm text-white/50">{app.downloads_count.toLocaleString()} downloads</span>
                </div>
              </div>
            </div>

            {/* Banner */}
            {app.banner_url && (
              <img src={app.banner_url} alt={app.name} className="w-full rounded-xl object-cover max-h-64 border border-white/10" />
            )}

            {/* Screenshots */}
            {app.screenshots?.length > 0 && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-white">Screenshots</h3>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {app.screenshots.map((shot, i) => (
                    <img key={i} src={shot.url} alt={shot.caption || `Screenshot ${i + 1}`} className="h-48 rounded-lg border border-white/10 object-cover shrink-0 hover:border-primer-500/40 transition-colors" />
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-white">About this app</h3>
              <p className="text-white/60 whitespace-pre-wrap leading-relaxed">{app.description}</p>
            </div>

            {/* Version info */}
            {app.latest_version && (
              <div>
                <h3 className="font-semibold text-lg mb-3 text-white">Version {app.latest_version.version}</h3>
                {app.latest_version.changelog && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-white/80 mb-1">What's new:</h4>
                    <p className="text-sm text-white/50 whitespace-pre-wrap">{app.latest_version.changelog}</p>
                  </div>
                )}
              </div>
            )}

            {/* Reviews */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-white">Reviews</h3>
                {user && !showReviewForm && (
                  <button onClick={() => setShowReviewForm(true)} className="btn-primary btn-sm flex items-center gap-1">
                    <Star className="w-4 h-4" /> Write a Review
                  </button>
                )}
              </div>

              {showReviewForm && (
                <form onSubmit={submitReview} className="bg-[#13131a] border border-white/10 rounded-xl p-5 mb-4">
                  <h4 className="font-semibold mb-3 text-white">Your Review</h4>
                  <div className="mb-3">
                    <label className="block text-sm font-medium mb-1 text-white/70">Rating</label>
                    <StarRating rating={reviewRating} interactive onChange={setReviewRating} size="md" />
                  </div>
                  <input
                    type="text"
                    placeholder="Review title (optional)"
                    value={reviewTitle}
                    onChange={e => setReviewTitle(e.target.value)}
                    className="input-field mb-3"
                  />
                  <textarea
                    placeholder="Share your experience..."
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    rows={4}
                    className="input-field mb-3"
                    required
                  />
                  <div className="flex gap-2">
                    <button type="submit" disabled={submitting} className="btn-primary btn-sm">
                      {submitting ? 'Submitting...' : 'Submit Review'}
                    </button>
                    <button type="button" onClick={() => setShowReviewForm(false)} className="btn-secondary btn-sm">Cancel</button>
                  </div>
                </form>
              )}

              {app.reviews?.length > 0 ? (
                <div className="space-y-3">
                  {app.reviews.map(review => (
                    <div key={review.id} className="bg-[#13131a] border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primer-600/20 border border-primer-500/20 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primer-400" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{review.username}</p>
                            <StarRating rating={review.rating} size="sm" />
                          </div>
                        </div>
                        <span className="text-xs text-white/30">{new Date(review.created_at).toLocaleDateString()}</span>
                      </div>
                      {review.title && <h4 className="font-medium text-sm mt-2 text-white">{review.title}</h4>}
                      {review.body && <p className="text-sm text-white/50 mt-1">{review.body}</p>}
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/30">
                        <span>Helpful ({review.helpful_count || 0})</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/40 text-sm">No reviews yet. Be the first!</p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="bg-[#13131a] border border-white/10 rounded-xl p-5 sticky top-24">
              {app.price > 0 ? (
                <div className="text-2xl font-bold text-white mb-3">${app.price.toFixed(2)}</div>
              ) : (
                <div className="text-lg font-semibold text-emerald-400 mb-3">Free</div>
              )}

              {app.is_installed ? (
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-3 py-1 bg-emerald-500/15 text-emerald-400 text-sm font-medium rounded-full border border-emerald-500/25">Installed</span>
                  </div>
                  <button onClick={handleUninstall} className="btn-secondary w-full flex items-center justify-center gap-2">
                    Uninstall
                  </button>
                </div>
              ) : (
                <div className="mb-4">
                  <button
                    onClick={handleInstall}
                    disabled={installing}
                    className="w-full flex items-center justify-center gap-2 mb-3 px-6 py-3 rounded-xl font-semibold bg-primer-600 text-white hover:bg-primer-500 transition-all shadow-glow hover:shadow-glow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Download className="w-5 h-5" /> {installing ? 'Installing...' : 'Install'}
                  </button>
                  {installing && (
                    <div className="space-y-2">
                      <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-primer-500 to-primer-400 h-full transition-all duration-300"
                          style={{ width: `${installProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-white/40 text-center">{Math.round(installProgress)}% Complete</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 text-sm border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 text-white/60">
                  <PlatformIcon className="w-4 h-4 text-white/40" />
                  <span>{app.latest_version?.platform || 'Windows'}</span>
                </div>
                {app.latest_version && (
                  <div className="flex items-center gap-2 text-white/60">
                    <Calendar className="w-4 h-4 text-white/40" />
                    <span>Version {app.latest_version.version}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-emerald-400">
                  <Shield className="w-4 h-4" />
                  <span>Verified & Safe</span>
                </div>
                <div className="flex items-center gap-2 text-white/60">
                  <User className="w-4 h-4 text-white/40" />
                  <span>{app.developer_display || app.developer_name}</span>
                </div>
                <hr className="border-white/10" />
                <p className="text-xs text-white/35">Category: {app.category}</p>
                <p className="text-xs text-white/35">Published: {app.published_at ? new Date(app.published_at).toLocaleDateString() : 'Pending'}</p>
                {app.latest_version?.file_size && (
                  <p className="text-xs text-white/35">
                    Size: {app.latest_version.file_size >= 1024 * 1024 * 1024
                      ? `${(app.latest_version.file_size / 1024 / 1024 / 1024).toFixed(2)} GB`
                      : `${(app.latest_version.file_size / 1024 / 1024).toFixed(1)} MB`}
                  </p>
                )}
                {app.website && (
                  <a href={app.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primer-400 hover:text-primer-300 transition-colors">
                    <Globe className="w-4 h-4" /> Website
                  </a>
                )}
                {app.support_email && (
                  <a href={`mailto:${app.support_email}`} className="flex items-center gap-2 text-primer-400 hover:text-primer-300 transition-colors">
                    <Mail className="w-4 h-4" /> Support
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
