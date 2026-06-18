import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetch(`/api/apps/${slug}`)
      .then(r => r.json())
      .then(data => setApp(data.app))
      .catch(() => toast.error('App not found'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleInstall = async () => {
    if (!user) {
      toast.error('Please sign in to install');
      return;
    }

    setInstalling(true);
    setInstallProgress(0);

    try {
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => Math.min(prev + Math.random() * 30, 90));
      }, 300);

      // Record installation
      await apiRequest(`/apps/${slug}/install`, { method: 'POST' });

      // Complete progress
      clearInterval(progressInterval);
      setInstallProgress(100);

      // Download the file
      if (app.latest_version?.file_url) {
        const link = document.createElement('a');
        link.href = app.latest_version.file_url;
        link.download = `${app.name}-${app.latest_version.version}.exe`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      toast.success('App installed!');
      setTimeout(() => {
        setInstalling(false);
        setInstallProgress(0);
        setApp({ ...app, is_installed: true });
      }, 500);
    } catch (e) {
      toast.error(e.message || 'Installation failed');
      setInstalling(false);
      setInstallProgress(0);
    }
  };

  const handleUninstall = async () => {
    if (!user) return;

    try {
      await apiRequest(`/apps/${slug}/install`, { method: 'DELETE' });
      toast.success('App uninstalled');
      setApp({ ...app, is_installed: false });
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
      const data = await fetch(`/api/apps/${slug}`).then(r => r.json());
      setApp(data.app);
    } catch (e) { toast.error(e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="animate-pulse space-y-6">
        <div className="h-4 bg-gray-200 rounded w-48" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-5">
              <div className="w-20 h-20 bg-gray-200 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-7 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
            <div className="h-48 bg-gray-200 rounded-xl" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-3/4" />
            </div>
          </div>
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
  if (!app) return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Download className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">App not found</h2>
      <p className="text-gray-500 mt-2 mb-6">This app doesn't exist or may have been removed.</p>
      <Link to="/store" className="btn-primary">Back to Store</Link>
    </div>
  );

  const PlatformIcon = platformIcons[app.latest_version?.platform] || Monitor;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/store" className="hover:text-gray-700">Store</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{app.name}</span>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div className="flex items-start gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primer-500 to-primer-700 flex items-center justify-center shrink-0 overflow-hidden">
              {app.icon_url ? (
                <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-3xl">{app.name.charAt(0)}</span>
              )}
            </div>
            <div>
              <h1 className="text-3xl font-bold">{app.name}</h1>
              <p className="text-gray-500 mt-1">by {app.developer_display || app.developer_name}</p>
              <div className="flex items-center gap-3 mt-2">
                <StarRating rating={app.rating_avg} count={app.rating_count} size="md" />
                <span className="text-sm text-gray-400">|</span>
                <span className="text-sm text-gray-500">{app.downloads_count.toLocaleString()} downloads</span>
              </div>
            </div>
          </div>

          {/* Banner */}
          {app.banner_url && (
            <img src={app.banner_url} alt={app.name} className="w-full rounded-xl object-cover max-h-64" />
          )}

          {/* Screenshots */}
          {app.screenshots?.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Screenshots</h3>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {app.screenshots.map((shot, i) => (
                  <img key={i} src={shot.url} alt={shot.caption || `Screenshot ${i + 1}`} className="h-48 rounded-lg border border-gray-200 object-cover shrink-0" />
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <h3 className="font-semibold text-lg mb-3">About this app</h3>
            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{app.description}</p>
          </div>

          {/* Version info */}
          {app.latest_version && (
            <div>
              <h3 className="font-semibold text-lg mb-3">Version {app.latest_version.version}</h3>
              {app.latest_version.changelog && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-700 mb-1">What's new:</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{app.latest_version.changelog}</p>
                </div>
              )}
            </div>
          )}

          {/* Reviews */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Reviews</h3>
              {user && !showReviewForm && (
                <button onClick={() => setShowReviewForm(true)} className="btn-primary btn-sm flex items-center gap-1">
                  <Star className="w-4 h-4" /> Write a Review
                </button>
              )}
            </div>

            {showReviewForm && (
              <form onSubmit={submitReview} className="card p-4 mb-4">
                <h4 className="font-semibold mb-3">Your Review</h4>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1">Rating</label>
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
                  <div key={review.id} className="card p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{review.username}</p>
                          <StarRating rating={review.rating} size="sm" />
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(review.created_at).toLocaleDateString()}</span>
                    </div>
                    {review.title && <h4 className="font-medium text-sm mt-2">{review.title}</h4>}
                    {review.body && <p className="text-sm text-gray-600 mt-1">{review.body}</p>}
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span>Helpful ({review.helpful_count || 0})</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No reviews yet. Be the first!</p>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="card p-5 sticky top-24">
            {app.price > 0 ? (
              <div className="text-2xl font-bold text-gray-900 mb-3">${app.price.toFixed(2)}</div>
            ) : (
              <div className="text-lg font-semibold text-green-600 mb-3">Free</div>
            )}

            {app.is_installed ? (
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between">
                  <span className="inline-block px-3 py-1 bg-green-50 text-green-700 text-sm font-medium rounded-full">✓ Installed</span>
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
                  className="btn-primary w-full flex items-center justify-center gap-2 mb-2"
                >
                  <Download className="w-5 h-5" /> {installing ? 'Installing...' : 'Install'}
                </button>
                {installing && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-primer-500 to-primer-600 h-full transition-all duration-300"
                        style={{ width: `${installProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500 text-center">{Math.round(installProgress)}% Complete</p>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <PlatformIcon className="w-4 h-4" />
                <span>{app.latest_version?.platform || 'Windows'}</span>
              </div>
              {app.latest_version && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Version {app.latest_version.version}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <Shield className="w-4 h-4" />
                <span>Verified & Safe</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <span>{app.developer_display || app.developer_name}</span>
              </div>
              <hr className="border-gray-100" />
              <p className="text-xs text-gray-400">Category: {app.category}</p>
              <p className="text-xs text-gray-400">Published: {app.published_at ? new Date(app.published_at).toLocaleDateString() : 'Pending'}</p>
              {app.latest_version?.file_size && (
                <p className="text-xs text-gray-400">
                  Size: {app.latest_version.file_size >= 1024 * 1024 * 1024
                    ? `${(app.latest_version.file_size / 1024 / 1024 / 1024).toFixed(2)} GB`
                    : `${(app.latest_version.file_size / 1024 / 1024).toFixed(1)} MB`}
                </p>
              )}
              {app.website && (
                <a href={app.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-primer-600 hover:text-primer-700">
                  <Globe className="w-4 h-4" /> Website
                </a>
              )}
              {app.support_email && (
                <a href={`mailto:${app.support_email}`} className="flex items-center gap-2 text-primer-600 hover:text-primer-700">
                  <Mail className="w-4 h-4" /> Support
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
