import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Upload, Image as ImageIcon, FileArchive, X, PlusCircle } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Productivity', 'Development', 'Design', 'Games', 'Education',
  'Business', 'Social', 'Entertainment', 'Utilities', 'Security',
  'Health & Fitness', 'Music', 'Photo & Video', 'Finance', 'Other'
];

const PLATFORMS = [
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'linux', label: 'Linux' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'web', label: 'Web' },
];

export default function SubmitApp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: '', description: '', short_description: '', category: 'Productivity',
    website: '', support_email: '', privacy_url: '',
    version: '1.0.0', changelog: '', platform: 'windows', min_os_version: '',
  });
  const [icon, setIcon] = useState(null);
  const [banner, setBanner] = useState(null);
  const [screenshots, setScreenshots] = useState([]);
  const [appFile, setAppFile] = useState(null);
  const [useExternalUrl, setUseExternalUrl] = useState(false);
  const [externalFileUrl, setExternalFileUrl] = useState('');
  const [externalFileSize, setExternalFileSize] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const iconDropzone = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    onDrop: (files) => setIcon(files[0]),
  });

  const bannerDropzone = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    onDrop: (files) => setBanner(files[0]),
  });

  const screenshotsDropzone = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 10,
    onDrop: (files) => setScreenshots(prev => [...prev, ...files].slice(0, 10)),
  });

  const appFileDropzone = useDropzone({
    maxFiles: 1,
    onDrop: (files) => setAppFile(files[0]),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.description) return toast.error('Name and description are required');
    if (!appFile && !externalFileUrl) return toast.error('Please upload an app file or provide an external download URL');

    setSubmitting(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => { if (v) formData.append(k, v); });
      if (icon) formData.append('icon', icon);
      if (banner) formData.append('banner', banner);
      screenshots.forEach(s => formData.append('screenshots', s));
      if (appFile) {
        formData.append('app_file', appFile);
      } else {
        formData.append('external_file_url', externalFileUrl);
        if (externalFileSize) formData.append('external_file_size', externalFileSize);
      }

      const token = localStorage.getItem('primers_token');
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('App submitted for review!');
      navigate('/developer');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="text-3xl font-bold mb-2">Submit New App</h1>
      <p className="text-gray-600 mb-8">Fill in the details below. Your app will be reviewed before going live.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg">Basic Information</h2>
          <div>
            <label className="block text-sm font-medium mb-1">App Name *</label>
            <input type="text" value={form.name} onChange={update('name')} className="input-field" placeholder="My Awesome App" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Short Description</label>
            <input type="text" value={form.short_description} onChange={update('short_description')} className="input-field" placeholder="A brief one-liner (max 200 chars)" maxLength={200} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description *</label>
            <textarea value={form.description} onChange={update('description')} className="input-field" rows={6} placeholder="Detailed description of your app, features, and usage instructions" required />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Category *</label>
              <select value={form.category} onChange={update('category')} className="input-field">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Website</label>
              <input type="url" value={form.website} onChange={update('website')} className="input-field" placeholder="https://..." />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Support Email</label>
              <input type="email" value={form.support_email} onChange={update('support_email')} className="input-field" placeholder="support@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Privacy Policy URL</label>
              <input type="url" value={form.privacy_url} onChange={update('privacy_url')} className="input-field" placeholder="https://..." />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg">Media</h2>
          <div>
            <label className="block text-sm font-medium mb-1">App Icon</label>
            <div {...iconDropzone.getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primer-400 transition-colors">
              <input {...iconDropzone.getInputProps()} />
              {icon ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-600">{icon.name}</span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setIcon(null); }} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="w-6 h-6 mx-auto" />
                  <p className="text-sm mt-1">Drop icon or click (PNG, 256x256 recommended)</p>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Banner Image</label>
            <div {...bannerDropzone.getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primer-400 transition-colors">
              <input {...bannerDropzone.getInputProps()} />
              {banner ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-600">{banner.name}</span>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setBanner(null); }} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="text-gray-500">
                  <Upload className="w-6 h-6 mx-auto" />
                  <p className="text-sm mt-1">Drop banner or click (PNG/JPG, recommended)</p>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Screenshots ({screenshots.length}/10)</label>
            <div {...screenshotsDropzone.getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-primer-400 transition-colors">
              <input {...screenshotsDropzone.getInputProps()} />
              <div className="text-gray-500">
                <Upload className="w-6 h-6 mx-auto" />
                <p className="text-sm mt-1">Drop screenshots or click (up to 10 images)</p>
              </div>
            </div>
            {screenshots.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {screenshots.map((file, i) => (
                  <div key={i} className="flex items-center gap-1 bg-gray-100 rounded-lg px-3 py-1.5 text-sm">
                    <ImageIcon className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">{file.name}</span>
                    <button type="button" onClick={() => setScreenshots(prev => prev.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 ml-1"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <h2 className="font-semibold text-lg">App File & Version</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Version *</label>
              <input type="text" value={form.version} onChange={update('version')} className="input-field" placeholder="1.0.0" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Platform *</label>
              <select value={form.platform} onChange={update('platform')} className="input-field">
                {PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Changelog</label>
            <textarea value={form.changelog} onChange={update('changelog')} className="input-field" rows={3} placeholder="What's new in this version?" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Minimum OS Version</label>
            <input type="text" value={form.min_os_version} onChange={update('min_os_version')} className="input-field" placeholder="e.g. Windows 10, macOS 12" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">App File *</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
                <button type="button" onClick={() => setUseExternalUrl(false)}
                  className={`px-3 py-1 font-medium transition-colors ${!useExternalUrl ? 'bg-primer-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  Upload File
                </button>
                <button type="button" onClick={() => setUseExternalUrl(true)}
                  className={`px-3 py-1 font-medium transition-colors ${useExternalUrl ? 'bg-primer-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                  External URL
                </button>
              </div>
            </div>
            {useExternalUrl ? (
              <div className="space-y-2">
                <input
                  type="url" value={externalFileUrl} onChange={e => setExternalFileUrl(e.target.value)}
                  className="input-field" placeholder="https://github.com/.../releases/download/v1.0.0/App-Installer.exe"
                />
                <input
                  type="number" value={externalFileSize} onChange={e => setExternalFileSize(e.target.value)}
                  className="input-field" placeholder="File size in bytes (optional, e.g. 1640000000 for 1.5 GB)"
                />
                <p className="text-xs text-gray-500">Use this for files over 500 MB. Host on GitHub Releases, Google Drive, etc.</p>
              </div>
            ) : (
              <div {...appFileDropzone.getRootProps()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-primer-400 transition-colors">
                <input {...appFileDropzone.getInputProps()} />
                {appFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileArchive className="w-5 h-5 text-green-600" />
                    <span className="text-green-600 font-medium">{appFile.name}</span>
                    <span className="text-gray-400 text-sm">({(appFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setAppFile(null); }} className="text-red-500 hover:text-red-700 ml-2"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <FileArchive className="w-8 h-8 mx-auto" />
                    <p className="text-sm mt-2 font-medium">Drop your app file here or click to browse</p>
                    <p className="text-xs mt-1">ZIP, EXE, DMG, APK, DEB, RPM, etc. (max 500 MB — use External URL for larger files)</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button type="button" onClick={() => navigate('/developer')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Submitting...' : 'Submit for Review'}
          </button>
        </div>
      </form>
    </div>
  );
}
