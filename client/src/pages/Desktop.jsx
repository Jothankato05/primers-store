import { Link } from 'react-router-dom';
import { Monitor } from 'lucide-react';

export default function Desktop() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center" style={{ background: 'rgba(47,87,232,.1)', color: '#2f57e8' }}><Monitor size={26} /></div>
      <h1 className="mt-5 text-2xl font-bold" style={{ color: 'var(--text-strong)' }}>Primers Store for Windows</h1>
      <p className="mt-2" style={{ color: 'var(--text-muted)' }}>The desktop installer is being prepared and will be available here shortly. Until then, every app can be downloaded straight from this website.</p>
      <Link to="/store" className="btn-primary inline-block mt-6">Browse apps</Link>
    </div>
  );
}
