import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Upload, ShieldCheck, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const perks = [
  [Upload, 'Upload from your browser', 'Installers up to 4 GB, icons and screenshots, with resumable uploads.'],
  [ShieldCheck, 'Reviewed before it goes live', 'Every app and update is checked by the Primers team before it is public.'],
  [BarChart3, 'See how you are doing', 'Downloads, ratings and reviews for each app in your developer console.'],
];

export default function DeveloperJoin() {
  const { user, isDeveloper, apiRequest, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) return <Navigate to="/login?next=%2Fdeveloper%2Fjoin" replace />;
  if (isDeveloper) return <Navigate to="/developer/submit" replace />;

  const join = async () => {
    setBusy(true);
    try {
      await apiRequest('/auth/become-developer', { method: 'POST', body: JSON.stringify({ accept_terms: true }) });
      await refreshUser();
      toast.success('You are a developer now. Let’s publish your first app.');
      navigate('/developer/submit', { replace: true });
    } catch (e) {
      toast.error(e.message);
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12">
      <p className="eyebrow">Primers Store for developers</p>
      <h1 className="mt-2 text-3xl font-bold" style={{ color: 'var(--text-strong)' }}>Publish your apps</h1>
      <p className="mt-2" style={{ color: 'var(--text-muted)' }}>Turn on developer tools for {user.display_name || user.username}. It is free and takes one click.</p>

      <div className="mt-8 space-y-4">
        {perks.map(([Icon, t, d]) => (
          <div key={t} className="flex gap-4">
            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center" style={{ background: 'rgba(47,87,232,.1)', color: '#2f57e8' }}><Icon size={18} /></div>
            <div><p className="font-semibold" style={{ color: 'var(--text-strong)' }}>{t}</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>{d}</p></div>
          </div>
        ))}
      </div>

      <div className="card p-5 mt-8">
        <label className="flex items-start gap-3 text-sm cursor-pointer" style={{ color: 'var(--text-body)' }}>
          <input type="checkbox" className="mt-1" checked={agree} onChange={e => setAgree(e.target.checked)} />
          <span>I will only publish software I own or have the right to distribute, with no malware, hidden data collection or deceptive behaviour, and I will keep a privacy policy for apps that collect personal data. I agree that Primers may review, reject or remove apps that break these rules. See the <Link to="/privacy" className="text-primer-400 underline">privacy policy</Link>.</span>
        </label>
        <button type="button" onClick={join} disabled={!agree || busy} className="btn-primary w-full mt-4">
          {busy ? 'Setting up…' : 'Become a developer'}
        </button>
      </div>
    </div>
  );
}
