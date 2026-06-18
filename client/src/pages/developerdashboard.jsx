import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Package, PlusCircle, Download, Star, Edit3, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', label: 'Pending Review' },
  reviewing: { icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Under Review' },
  approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' },
  suspended: { icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', label: 'Suspended' },
};

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, downloads: 0, approved: 0, pending: 0 });

  useEffect(() => {
    const token = localStorage.getItem('primers_token');
    fetch('/api/apps/developer/mine', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const apps = data.apps || [];
        setApps(apps);
        setStats({
          total: apps.length,
          downloads: apps.reduce((sum, a) => sum + (a.downloads_count || 0), 0),
          approved: apps.filter(a => a.status === 'approved').length,
          pending: apps.filter(a => a.status === 'pending' || a.status === 'reviewing').length,
        });
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Developer Console</h1>
          <p className="text-gray-600 mt-1">Manage your apps and track performance</p>
        </div>
        <Link to="/developer/submit" className="btn-primary flex items-center gap-2">
          <PlusCircle className="w-5 h-5" /> Submit New App
        </Link>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Apps', value: stats.total, icon: Package, color: 'text-primer-600', bg: 'bg-primer-50' },
          { label: 'Total Downloads', value: stats.downloads.toLocaleString(), icon: Download, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl p-5`}>
            <div className="flex items-center gap-3">
              <stat.icon className={`w-8 h-8 ${stat.color}`} />
              <div>
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-gray-600">{stat.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Apps List */}
      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 animate-pulse"><div className="h-16 bg-gray-200 rounded" /></div>)}</div>
      ) : apps.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="mt-4 text-lg font-semibold text-gray-700">No apps yet</h3>
          <p className="text-gray-500 mt-1">Submit your first app to get started</p>
          <Link to="/developer/submit" className="btn-primary mt-4 inline-flex items-center gap-2">
            <PlusCircle className="w-5 h-5" /> Submit New App
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.map(app => {
            const cfg = statusConfig[app.status] || statusConfig.pending;
            const StatusIcon = cfg.icon;
            return (
              <div key={app.id} className={`card p-5 border-l-4 ${cfg.border}`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primer-500 to-primer-700 flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                      {app.icon_url ? <img src={app.icon_url} alt="" className="w-full h-full object-cover" /> : app.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{app.name}</h3>
                      <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" />{app.downloads_count.toLocaleString()}</span>
                        {app.rating_count > 0 && (
                          <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-yellow-400" />{app.rating_avg}</span>
                        )}
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" /> {cfg.label}
                        </span>
                      </div>
                      {app.status === 'rejected' && app.review_notes && (
                        <p className="text-xs text-red-600 mt-1">Reason: {app.review_notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.status === 'approved' && (
                      <Link to={`/store/${app.slug}`} className="btn-secondary btn-sm">View in Store</Link>
                    )}
                    <Link to={`/developer/edit/${app.id}`} className="btn-primary btn-sm flex items-center gap-1">
                      <Edit3 className="w-4 h-4" /> Manage
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
