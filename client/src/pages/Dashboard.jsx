import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Settings, Package, Shield, Download, Star, ChevronRight, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user, apiRequest, refreshUser, isDeveloper, isAdmin } = useAuth();
  const [profile, setProfile] = useState({ display_name: '', bio: '' });
  const [myApps, setMyApps] = useState([]);
  const [showDevApply, setShowDevApply] = useState(false);
  const [devReason, setDevReason] = useState('');
  const [devCompany, setDevCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (isDeveloper) {
      const token = localStorage.getItem('primers_token');
      const base = window.__PRIMERS__?.apiUrl || '/api';
      fetch(`${base}/apps/developer/mine`, { headers: { 'Authorization': `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => setMyApps(d.apps || []))
        .catch(() => {});
    }
  }, [isDeveloper]);

  useEffect(() => {
    setProfile({ display_name: user?.display_name || '', bio: user?.bio || '' });
  }, [user]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/auth/profile', { method: 'PATCH', body: JSON.stringify(profile) });
      await refreshUser();
      toast.success('Profile updated');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const applyDeveloper = async (e) => {
    e.preventDefault();
    if (devReason.length < 20) return toast.error('Please write at least 20 characters');
    setApplying(true);
    try {
      await apiRequest('/auth/apply-developer', { method: 'POST', body: JSON.stringify({ company_name: devCompany, reason: devReason }) });
      toast.success('Developer application submitted!');
      setShowDevApply(false);
    } catch (e) { toast.error(e.message); }
    finally { setApplying(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-8">My Dashboard</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile */}
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-primer-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-primer-600" />
            </div>
            <div>
              <h2 className="font-semibold">{user?.display_name || user?.username}</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-primer-100 text-primer-700 capitalize">{user?.role}</span>
            </div>
          </div>
          <form onSubmit={saveProfile} className="space-y-3">
            <input
              type="text"
              value={profile.display_name}
              onChange={e => setProfile({ ...profile, display_name: e.target.value })}
              className="input-field"
              placeholder="Display name"
            />
            <textarea
              value={profile.bio}
              onChange={e => setProfile({ ...profile, bio: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Tell us about yourself..."
            />
            <button type="submit" disabled={saving} className="btn-primary w-full btn-sm">
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </form>
        </div>

        {/* Quick Links */}
        <div className="card p-6 space-y-3">
          <h3 className="font-semibold text-lg mb-2">Quick Links</h3>
          <Link to="/store" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-gray-400" />
              <span className="text-sm">Browse Store</span>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </Link>
          {isDeveloper && (
            <Link to="/developer" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Developer Console</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin" className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Admin Panel</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
          )}
          {!isDeveloper && user?.role === 'user' && !showDevApply && (
            <button onClick={() => setShowDevApply(true)} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors w-full">
              <div className="flex items-center gap-3">
                <Edit3 className="w-5 h-5 text-gray-400" />
                <span className="text-sm">Become a Developer</span>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Developer Application Form */}
        {showDevApply && (
          <div className="card p-6 lg:col-span-1">
            <h3 className="font-semibold text-lg mb-3">Apply as Developer</h3>
            <form onSubmit={applyDeveloper} className="space-y-3">
              <input
                type="text"
                value={devCompany}
                onChange={e => setDevCompany(e.target.value)}
                className="input-field"
                placeholder="Company name (optional)"
              />
              <textarea
                value={devReason}
                onChange={e => setDevReason(e.target.value)}
                className="input-field"
                rows={4}
                placeholder="Why do you want to become a developer? What kind of apps will you publish? (min 20 chars)"
                required
              />
              <div className="flex gap-2">
                <button type="submit" disabled={applying} className="btn-primary btn-sm flex-1">{applying ? 'Submitting...' : 'Submit'}</button>
                <button type="button" onClick={() => setShowDevApply(false)} className="btn-secondary btn-sm">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* My Apps (if developer) */}
        {isDeveloper && myApps.length > 0 && (
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">My Apps</h2>
              <Link to="/developer/submit" className="btn-primary btn-sm">Submit New App</Link>
            </div>
            <div className="space-y-3">
              {myApps.map(app => (
                <div key={app.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primer-500 to-primer-700 flex items-center justify-center text-white font-bold">
                      {app.icon_url ? <img src={app.icon_url} alt="" className="w-full h-full object-cover rounded-lg" /> : app.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-xs text-gray-500">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          app.status === 'approved' ? 'bg-green-100 text-green-700' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {app.status}
                        </span>
                        {app.status === 'rejected' && app.review_notes && (
                          <span className="ml-2 text-red-500">— {app.review_notes}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <Link to={`/developer/edit/${app.id}`} className="btn-secondary btn-sm">Manage</Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
