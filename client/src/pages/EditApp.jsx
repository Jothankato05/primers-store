import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useDropzone } from 'react-dropzone';
import { Image as ImageIcon, Upload, FileArchive, X, Save, PlusCircle, Trash2, ArrowLeft, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const CATEGORIES = ['Productivity', 'Development', 'Design', 'Games', 'Education', 'Business', 'Social', 'Entertainment', 'Utilities', 'Security', 'Health & Fitness', 'Music', 'Photo & Video', 'Finance', 'Other'];
const PLATFORMS = [
  { value: 'windows', label: 'Windows' }, { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' }, { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' }, { value: 'web', label: 'Web' },
];

export default function EditApp() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingDesc, setGeneratingDesc] = useState(false);
  const [form, setForm] = useState({});
  const [newIcon, setNewIcon] = useState(null);
  const [newBanner, setNewBanner] = useState(null);
  const [newScreenshots, setNewScreenshots] = useState([]);

  const [newVersion, setNewVersion] = useState({ version: '', changelog: '', platform: 'windows', min_os_version: '' });
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [showVersionForm, setShowVersionForm] = useState(false);
  const [versionUseExternalUrl, setVersionUseExternalUrl] = useState(false);
  const [versionExternalUrl, setVersionExternalUrl] = useState('');
  const [versionExternalSize, setVersionExternalSize] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('primers_token');
    const base = window.__PRIMERS__?.apiUrl || '/api';
    fetch(`${base}/apps/${id}/manage`, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setApp(data.app);
        setForm({
          name: data.app.name, description: data.app.description,
          short_description: data.app.short_description || '',
          category: data.app.category, website: data.app.website || '',
          support_email: data.app.support_email || '', privacy_url: data.app.privacy_url || '',
        });
        setNewVersion({ version: '', changelog: '', platform: data.app.versions?.[0]?.platform || 'windows', min_os_version: '' });
      })
      .catch(() => toast.error('App not found'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const updateVersion = (field) => (e) => setNewVersion({ ...newVersion, [field]: e.target.value });

  const generateShortDesc = async () => {
    if (!form.name || !form.description) return toast.error('Name and description must be filled in first');
    setGeneratingDesc(true);
    try {
      const token = localStorage.getItem('primers_token');
      const base = window.__PRIMERS__?.apiUrl || '/api';
      const res = await fetch(`${base}/ai/generate-description`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, category: form.category, description: form.description }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm(f => ({ ...f, short_description: data.short_description }));
      toast.success('Short description generated');
    } catch (e) { toast.error(e.message); }
    finally { setGeneratingDesc(false); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v !== undefined) formData.append(k, v); });
      if (newIcon) formData.append('icon', newIcon);
      if (newBanner) formData.append('banner', newBanner);
      newScreenshots.forEach(s => formData.append('screenshots', s));

      const token = localStorage.getItem('primers_token');
      const base = window.__PRIMERS__?.apiUrl || '/api';
      const res = await fetch(`${base}/apps/${id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('App updated and resubmitted for review');
      navigate('/developer');
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleAddVersion = async (e) => {
    e.preventDefault();
    if (!newVersion.version || (!newVersionFile && !versionExternalUrl)) return toast.error('Version and either a file or external URL are required');
    setSaving(true);
    try {
      const formData = new FormData();
      Object.entries(newVersion).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (newVersionFile) {
        formData.append('app_file', newVersionFile);
      } else {
        formData.append('external_file_url', versionExternalUrl);
        if (versionExternalSize) formData.append('external_file_size', versionExternalSize);
      }

      const token = localStorage.getItem('primers_token');
      const base2 = window.__PRIMERS__?.apiUrl || '/api';
      const res = await fetch(`${base2}/apps/${id}/versions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('New version submitted for review');
      setShowVersionForm(false);
      setNewVersionFile(null);
      const base = window.__PRIMERS__?.apiUrl || '/api';
      const appRes = await fetch(`${base}/apps/${id}/manage`, { headers: { 'Authorization': `Bearer ${token}` } });
      const appData = await appRes.json();
      setApp(appData.app);
    } catch (e) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const deleteScreenshot = async (screenshotId) => {
    try {
      const token = localStorage.getItem('primers_token');
      const base = window.__PRIMERS__?.apiUrl || '/api';
      await fetch(`${base}/apps/${id}/screenshots/${screenshotId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
      });
      setApp(prev => ({ ...prev, screenshots: prev.screenshots.filter(s => s.id !== screenshotId) }));
      toast.success('Screenshot removed');
    } catch { toast.error('Failed to delete'); }
  };

  const screenshotsDropzone = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 10,
    onDrop: (files) => setNewScreenshots(prev => [...prev, ...files].slice(0, 10)),
  });

  const iconDropzone = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    onDrop: (files) => setNewIcon(files[0]),
  });

  const bannerDropzone = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    onDrop: (files) => setNewBanner(files[0]),
  });

  const versionFileDropzone = useDropzone({
    maxFiles: 1,
    onDrop: (files) => setNewVersionFile(files[0]),
  });

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-8"><div className="animate-pulse space-y-4"><div className="h-48 bg-gray-200 rounded-xl" /></div></div>;
  if (!app) return <div className="max-w-3xl mx-auto px-4 py-20 text-center"><h2 className="text-2xl font-bold">App not found</h2></div>;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <button onClick={() => navigate('/developer')} className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6">
        <ArrowLeft className="w-4 h-4" /> Back to Developer Console
      </button>

      <div className="flex items-center gap-4 mb-8">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primer-500 to-primer-700 flex items-center justify-center text-white font-bold text-xl overflow-hidden">
          {app.icon_url ? <img src={app.icon_url} alt="" className="w-full h-full object-cover" /> : app.name.charAt(0)}
        </div>
        <div>
          <h1 className="text-2xl font-bold">Edit: {app.name}</h1>
          <span className={`text-sm px-2 py-0.5 rounded-full font-medium ${
            app.status === 'approved' ? 'bg-green-100 text-green-700' :
            app.status === 'rejected' ? 'bg-red-100 text-red-700' :
            app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
            'bg-gray-100 text-gray-700'
          }`}>{app.status}</span>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg">App Details</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input type="text" value={form.name} onChange={update('name')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select value={form.category} onChange={update('category')} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Short Description</label>
              <button
                type="button"
                onClick={generateShortDesc}
                disabled={generatingDesc}
                className="flex items-center gap-1 text-xs text-primer-600 hover:text-primer-700 font-medium disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generatingDesc ? 'Generating...' : 'Generate with AI'}
              </button>
            </div>
            <input type="text" value={form.short_description} onChange={update('short_description')} className="input-field" maxLength={200} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea value={form.description} onChange={update('description')} className="input-field" rows={6} />
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input type="url" value={form.website} onChange={update('website')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Support Email</label>
              <input type="email" value={form.support_email} onChange={update('support_email')} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Privacy URL</label>
              <input type="url" value={form.privacy_url} onChange={update('privacy_url')} className="input-field" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg">Update Media</h2>
          <div>
            <label className="block text-sm font-medium mb-1">New Icon</label>
            <div {...iconDropzone.getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-primer-400">
              <input {...iconDropzone.getInputProps()} />
              {newIcon ? (
                <div className="flex items-center justify-between"><span className="text-sm text-green-600">{newIcon.name}</span><button type="button" onClick={(e) => { e.stopPropagation(); setNewIcon(null); }}><X className="w-4 h-4 text-red-500" /></button></div>
              ) : <p className="text-sm text-gray-500">Drop new icon (optional)</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">New Banner</label>
            <div {...bannerDropzone.getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-primer-400">
              <input {...bannerDropzone.getInputProps()} />
              {newBanner ? (
                <div className="flex items-center justify-between"><span className="text-sm text-green-600">{newBanner.name}</span><button type="button" onClick={(e) => { e.stopPropagation(); setNewBanner(null); }}><X className="w-4 h-4 text-red-500" /></button></div>
              ) : <p className="text-sm text-gray-500">Drop new banner (optional)</p>}
            </div>
          </div>
          {app.screenshots?.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Current Screenshots</label>
              <div className="flex flex-wrap gap-2">
                {app.screenshots.map(s => (
                  <div key={s.id} className="relative group">
                    <img src={s.url} alt="" className="h-20 rounded-lg object-cover" />
                    <button type="button" onClick={() => deleteScreenshot(s.id)} className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Add Screenshots</label>
            <div {...screenshotsDropzone.getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-3 text-center cursor-pointer hover:border-primer-400">
              <input {...screenshotsDropzone.getInputProps()} />
              <p className="text-sm text-gray-500">Drop new screenshots</p>
            </div>
            {newScreenshots.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newScreenshots.map((f, i) => (
                  <div key={i} className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1 text-sm">
                    {f.name}
                    <button type="button" onClick={() => setNewScreenshots(prev => prev.filter((_, j) => j !== i))}><X className="w-3.5 h-3.5 text-red-500" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save & Resubmit'}
          </button>
        </div>
      </form>

      <div className="mt-8 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Versions</h2>
          {!showVersionForm && (
            <button onClick={() => setShowVersionForm(true)} className="btn-primary btn-sm flex items-center gap-1">
              <PlusCircle className="w-4 h-4" /> Add Version
            </button>
          )}
        </div>

        {app.versions?.length > 0 && (
          <div className="space-y-2">
            {app.versions.map(v => (
              <div key={v.id} className="card p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">v{v.version}</p>
                  <p className="text-xs text-gray-500">
                    {(v.file_size / 1024 / 1024).toFixed(1)} MB • {v.platform} • {new Date(v.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  v.status === 'approved' ? 'bg-green-100 text-green-700' :
                  v.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>{v.status}</span>
              </div>
            ))}
          </div>
        )}

        {showVersionForm && (
          <form onSubmit={handleAddVersion} className="card p-6 space-y-4">
            <h3 className="font-semibold">New Version</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Version *</label>
                <input type="text" value={newVersion.version} onChange={updateVersion('version')} className="input-field" placeholder="1.1.0" required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Platform</label>
                <select value={newVersion.platform} onChange={updateVersion('platform')} className="input-field">
                  {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Changelog</label>
              <textarea value={newVersion.changelog} onChange={updateVersion('changelog')} className="input-field" rows={3} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium">App File *</label>
                <div className="flex rounded-lg overflow-hidden text-xs" style={{ border: '1px solid var(--border)' }}>
                  <button type="button" onClick={() => setVersionUseExternalUrl(false)}
                    className={`px-3 py-1 font-medium transition-colors ${!versionUseExternalUrl ? 'bg-primer-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                    Upload
                  </button>
                  <button type="button" onClick={() => setVersionUseExternalUrl(true)}
                    className={`px-3 py-1 font-medium transition-colors ${versionUseExternalUrl ? 'bg-primer-600 text-white' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>
                    External URL
                  </button>
                </div>
              </div>
              {versionUseExternalUrl ? (
                <div className="space-y-2">
                  <input type="url" value={versionExternalUrl} onChange={e => setVersionExternalUrl(e.target.value)}
                    className="input-field" placeholder="https://github.com/.../releases/download/v1.0.0/App.exe" />
                  <input type="number" value={versionExternalSize} onChange={e => setVersionExternalSize(e.target.value)}
                    className="input-field" placeholder="File size in bytes (optional)" />
                  <p className="text-xs text-gray-500">For files over 500 MB — host on GitHub Releases, Google Drive, etc.</p>
                </div>
              ) : (
                <div {...versionFileDropzone.getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primer-400">
                  <input {...versionFileDropzone.getInputProps()} />
                  {newVersionFile ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileArchive className="w-5 h-5 text-green-600" />
                      <span className="text-green-600">{newVersionFile.name}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setNewVersionFile(null); }}><X className="w-4 h-4 text-red-500" /></button>
                    </div>
                  ) : (
                    <div className="text-gray-500">
                      <Upload className="w-6 h-6 mx-auto" />
                      <p className="text-sm mt-1">Drop app file or click (max 500 MB)</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowVersionForm(false)} className="btn-secondary btn-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? 'Adding...' : 'Add Version'}</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
