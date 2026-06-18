import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Users, Package, Download, Star, Clock, CheckCircle, XCircle, Search, Eye, UserCheck, Trash2, AlertTriangle, Link as LinkIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const { apiRequest } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState({});
  const [apps, setApps] = useState([]);
  const [users, setUsers] = useState([]);
  const [devApps, setDevApps] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');

  const token = localStorage.getItem('primers_token');
  const headers = { 'Authorization': `Bearer ${token}` };

  useEffect(() => {
    fetch('/api/admin/dashboard', { headers }).then(r => r.json()).then(d => setStats(d.stats)).catch(() => {});
    loadApps();
    loadUsers();
    loadDevApplications();
  }, []);

  const loadApps = (status = statusFilter, search = searchTerm) => {
    setLoading(true);
    const params = new URLSearchParams({ status, limit: 50 });
    if (search) params.set('search', search);
    fetch(`/api/admin/apps?${params}`, { headers })
      .then(r => r.json()).then(d => setApps(d.apps || []))
      .finally(() => setLoading(false));
  };

  const loadUsers = (search = '') => {
    const params = new URLSearchParams({ limit: 50 });
    if (search) params.set('search', search);
    fetch(`/api/admin/users?${params}`, { headers }).then(r => r.json()).then(d => setUsers(d.users || []));
  };

  const loadDevApplications = () => {
    fetch('/api/admin/developer-applications?status=pending', { headers })
      .then(r => r.json()).then(d => setDevApps(d.applications || []));
  };

  const loadReviews = () => {
    fetch('/api/admin/reviews?limit=50', { headers }).then(r => r.json()).then(d => setReviews(d.reviews || []));
  };

  const reviewApp = async (appId, status, notes = '') => {
    try {
      await apiRequest(`/admin/apps/${appId}/review`, {
        method: 'PATCH', body: JSON.stringify({ status, review_notes: notes }),
      });
      toast.success(`App ${status}`);
      loadApps(); loadDevApplications();
    } catch (e) { toast.error(e.message); }
  };

  const reviewDevApp = async (appId, status, notes = '') => {
    try {
      await apiRequest(`/admin/developer-applications/${appId}/review`, {
        method: 'PATCH', body: JSON.stringify({ status, review_notes: notes }),
      });
      toast.success(`Developer application ${status}`);
      loadDevApplications(); loadUsers();
    } catch (e) { toast.error(e.message); }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await apiRequest(`/admin/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
      toast.success('Role updated');
      loadUsers();
    } catch (e) { toast.error(e.message); }
  };

  const deleteReview = async (reviewId) => {
    if (!confirm('Delete this review?')) return;
    try {
      await apiRequest(`/admin/reviews/${reviewId}`, { method: 'DELETE' });
      toast.success('Review deleted');
      loadReviews();
    } catch (e) { toast.error(e.message); }
  };

  const handleSearch = (e) => { e.preventDefault(); loadApps(statusFilter, searchTerm); };

  const updateVersionUrl = async (appId, versionId, fileUrl, fileSize) => {
    try {
      await apiRequest(`/admin/apps/${appId}/versions/${versionId}/url`, {
        method: 'PATCH',
        body: JSON.stringify({ file_url: fileUrl, file_size: fileSize ? Number(fileSize) : undefined }),
      });
      toast.success('Download URL updated');
    } catch (e) { toast.error(e.message); }
  };

  const [appDetail, setAppDetail] = useState(null);
  const [editingVersionUrl, setEditingVersionUrl] = useState({});

  const loadAppDetail = async (appId) => {
    const data = await fetch(`/api/admin/apps/${appId}`, { headers }).then(r => r.json());
    setAppDetail(data.app);
    const initial = {};
    (data.app.versions || []).forEach(v => { initial[v.id] = { url: v.file_url || '', size: v.file_size || '' }; });
    setEditingVersionUrl(initial);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Shield },
    { id: 'apps', label: 'Apps', icon: Package, badge: stats.pending_apps },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'developers', label: 'Developers', icon: UserCheck, badge: stats.pending_developers },
    { id: 'reviews', label: 'Reviews', icon: Star },
  ];

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">Admin Panel</h1>
      <p className="text-gray-600 mb-8">Manage apps, users, and review submissions</p>

      <div className="flex flex-wrap gap-2 mb-8">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); if (t.id === 'reviews') loadReviews(); if (t.id === 'developers') loadDevApplications(); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-primer-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
            {t.badge > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                tab === t.id ? 'bg-white text-primer-600' : 'bg-red-500 text-white'
              }`}>{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Users', value: stats.total_users, icon: Users, color: 'bg-blue-50 text-blue-600' },
            { label: 'Total Apps', value: stats.total_apps, icon: Package, color: 'bg-purple-50 text-purple-600' },
            { label: 'Pending Review', value: stats.pending_apps, icon: Clock, color: 'bg-yellow-50 text-yellow-600' },
            { label: 'Downloads', value: stats.total_downloads?.toLocaleString() || '0', icon: Download, color: 'bg-green-50 text-green-600' },
            { label: 'Approved Apps', value: stats.approved_apps, icon: CheckCircle, color: 'bg-green-50 text-green-600' },
            { label: 'Reviews', value: stats.total_reviews, icon: Star, color: 'bg-orange-50 text-orange-600' },
            { label: 'Pending Devs', value: stats.pending_developers, icon: UserCheck, color: 'bg-pink-50 text-pink-600' },
            { label: 'Pending Versions', value: stats.pending_versions, icon: Clock, color: 'bg-cyan-50 text-cyan-600' },
          ].map((s, i) => (
            <div key={i} className={`${s.color.split(' ')[0]} rounded-xl p-5`}>
              <div className="flex items-center gap-3">
                <s.icon className={`w-8 h-8 ${s.color.split(' ')[1]}`} />
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-sm text-gray-600">{s.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'apps' && (
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search apps..." className="input-field pl-10"
              />
            </form>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); loadApps(e.target.value, searchTerm); }} className="input-field w-auto">
              <option value="pending">Pending</option>
              <option value="reviewing">Reviewing</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="">All</option>
            </select>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card p-5 animate-pulse"><div className="h-20 bg-gray-200 rounded" /></div>)}</div>
          ) : apps.length === 0 ? (
            <div className="card p-12 text-center"><p className="text-gray-500">No apps found</p></div>
          ) : (
            <div className="space-y-3">
              {apps.map(app => (
                <div key={app.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primer-500 to-primer-700 flex items-center justify-center text-white font-bold text-lg overflow-hidden shrink-0">
                        {app.icon_url ? <img src={app.icon_url} alt="" className="w-full h-full object-cover" /> : app.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{app.name}</h3>
                        <p className="text-xs text-gray-500">by {app.developer_name} ({app.developer_email})</p>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{app.description}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            app.status === 'approved' ? 'bg-green-100 text-green-700' :
                            app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>{app.status}</span>
                          <span className="text-xs text-gray-400">{app.category}</span>
                          {app.review_notes && <span className="text-xs text-gray-500 italic">— {app.review_notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {app.status === 'pending' && (
                        <>
                          <button onClick={() => reviewApp(app.id, 'reviewing')} className="btn-secondary btn-sm">Reviewing</button>
                          <button onClick={() => reviewApp(app.id, 'approved')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700">Approve</button>
                          <button onClick={() => {
                            const notes = prompt('Rejection reason (optional):');
                            reviewApp(app.id, 'rejected', notes || '');
                          }} className="btn-danger btn-sm">Reject</button>
                        </>
                      )}
                      {app.status === 'approved' && (
                        <button onClick={() => {
                          const notes = prompt('Suspension reason (optional):');
                          if (notes !== null) reviewApp(app.id, 'suspended', notes || '');
                        }} className="btn-danger btn-sm">Suspend</button>
                      )}
                      {app.status === 'suspended' && (
                        <button onClick={() => reviewApp(app.id, 'approved')} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700">Reinstate</button>
                      )}
                      <button onClick={() => loadAppDetail(app.id)} className="btn-secondary btn-sm flex items-center gap-1">
                        <Eye className="w-4 h-4" /> Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'users' && (
        <div>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text" placeholder="Search users..."
                onChange={e => loadUsers(e.target.value)} className="input-field pl-10"
              />
            </div>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Verified</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-sm">{u.display_name || u.username}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role}
                        onChange={e => updateUserRole(u.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1"
                      >
                        <option value="user">User</option>
                        <option value="developer">Developer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {u.email_verified ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      {!u.email_verified && (
                        <button
                          onClick={async () => {
                            await apiRequest(`/admin/users/${u.id}/verify`, { method: 'PATCH' });
                            loadUsers(); toast.success('User verified');
                          }}
                          className="text-xs text-primer-600 hover:text-primer-700 font-medium"
                        >
                          Verify
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'developers' && (
        <div>
          <h2 className="font-semibold text-lg mb-4">Pending Developer Applications ({devApps.length})</h2>
          {devApps.length === 0 ? (
            <div className="card p-12 text-center"><p className="text-gray-500">No pending applications</p></div>
          ) : (
            <div className="space-y-3">
              {devApps.map(app => (
                <div key={app.id} className="card p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{app.username} ({app.email})</p>
                      {app.company_name && <p className="text-sm text-gray-600">Company: {app.company_name}</p>}
                      <p className="text-sm text-gray-600 mt-2">{app.reason}</p>
                      <p className="text-xs text-gray-400 mt-1">Applied: {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => reviewDevApp(app.id, 'approved')} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">Approve</button>
                      <button onClick={() => {
                        const notes = prompt('Rejection reason (optional):');
                        if (notes !== null) reviewDevApp(app.id, 'rejected', notes || '');
                      }} className="btn-danger">Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div>
          <h2 className="font-semibold text-lg mb-4">Reviews</h2>
          {reviews.length === 0 ? (
            <div className="card p-12 text-center"><p className="text-gray-500">No reviews</p></div>
          ) : (
            <div className="space-y-3">
              {reviews.map(review => (
                <div key={review.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{review.username}</p>
                        <span className="text-yellow-400">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span>
                        <span className="text-xs text-gray-400">on {review.app_name}</span>
                      </div>
                      {review.title && <p className="font-medium text-sm mt-1">{review.title}</p>}
                      {review.body && <p className="text-sm text-gray-600 mt-1">{review.body}</p>}
                      <p className="text-xs text-gray-400 mt-1">{new Date(review.created_at).toLocaleDateString()}</p>
                    </div>
                    <button onClick={() => deleteReview(review.id)} className="text-red-500 hover:text-red-700 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>

    {appDetail && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setAppDetail(null)}>
        <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
          <div className="p-6 border-b border-gray-200 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">{appDetail.name}</h2>
              <p className="text-sm text-gray-500">by {appDetail.developer_name} • {appDetail.category}</p>
            </div>
            <button onClick={() => setAppDetail(null)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
          </div>
          <div className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Versions &amp; Download URLs</h3>
              {(!appDetail.versions || appDetail.versions.length === 0) ? (
                <p className="text-sm text-gray-500">No versions</p>
              ) : (
                <div className="space-y-3">
                  {appDetail.versions.map(v => (
                    <div key={v.id} className="border border-gray-200 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">v{v.version} — {v.platform}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          v.status === 'approved' ? 'bg-green-100 text-green-700' :
                          v.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{v.status}</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Size: {v.file_size ? `${(v.file_size / 1024 / 1024).toFixed(1)} MB` : 'unknown'}
                      </p>
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">Download URL</label>
                        <input
                          type="url"
                          value={editingVersionUrl[v.id]?.url ?? v.file_url ?? ''}
                          onChange={e => setEditingVersionUrl(prev => ({ ...prev, [v.id]: { ...prev[v.id], url: e.target.value } }))}
                          className="input-field text-xs"
                          placeholder="https://..."
                        />
                        <input
                          type="number"
                          value={editingVersionUrl[v.id]?.size ?? v.file_size ?? ''}
                          onChange={e => setEditingVersionUrl(prev => ({ ...prev, [v.id]: { ...prev[v.id], size: e.target.value } }))}
                          className="input-field text-xs"
                          placeholder="File size in bytes (optional)"
                        />
                        <button
                          onClick={() => updateVersionUrl(appDetail.id, v.id, editingVersionUrl[v.id]?.url, editingVersionUrl[v.id]?.size)}
                          className="btn-primary btn-sm w-full mt-1"
                        >
                          Save URL
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {appDetail.review_notes && (
              <div>
                <h3 className="font-semibold mb-1">Review Notes</h3>
                <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{appDetail.review_notes}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
