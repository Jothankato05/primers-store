import { useState } from 'react';
import { Monitor, Download, X, Zap, CheckCircle } from 'lucide-react';

const DISMISS_KEY = 'primers_desktop_banner_dismissed';
const API_BASE = window.__PRIMERS__?.apiUrl || import.meta.env.VITE_API_URL || '/api';

export default function DesktopBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  );
  const [status, setStatus] = useState('idle'); // idle | downloading | done

  if (window.__PRIMERS__?.isElectron) return null;
  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  const handleDownload = () => {
    if (status !== 'idle') return;
    setStatus('downloading');

    // Trigger download silently — user stays on the page
    const link = document.createElement('a');
    link.href = `${API_BASE}/download/desktop`;
    link.download = 'Primers-Store-Setup.exe';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Show done state briefly, then auto-dismiss
    setTimeout(() => setStatus('done'), 1500);
    setTimeout(() => dismiss(), 4000);
  };

  return (
    <div className="bg-gradient-to-r from-primer-600 to-primer-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        {/* Icon */}
        <div className="shrink-0 w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
          {status === 'done'
            ? <CheckCircle className="w-4 h-4 text-green-300" />
            : <Monitor className="w-4 h-4" />}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          {status === 'done' ? (
            <p className="text-sm font-medium">
              Download started — run the installer and open <span className="font-bold">Primers Store</span> for native installs.
            </p>
          ) : (
            <p className="text-sm font-medium leading-snug">
              Get the <span className="font-bold">Primers Store</span> desktop app —
              <span className="hidden sm:inline"> one-click silent installs, no browser needed.</span>
            </p>
          )}
        </div>

        {/* Perks — hidden on small screens */}
        {status === 'idle' && (
          <div className="hidden md:flex items-center gap-4 shrink-0 text-xs text-white/80">
            <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Silent installs</span>
            <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Real progress bar</span>
            <span className="flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> Windows native</span>
          </div>
        )}

        {/* CTA */}
        {status === 'idle' && (
          <button
            onClick={handleDownload}
            className="shrink-0 flex items-center gap-1.5 bg-white text-primer-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primer-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download App
          </button>
        )}

        {status === 'downloading' && (
          <span className="shrink-0 flex items-center gap-1.5 bg-white/20 text-white text-xs font-medium px-3 py-1.5 rounded-lg">
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Starting…
          </span>
        )}

        {status === 'done' && (
          <span className="shrink-0 flex items-center gap-1.5 bg-green-500/30 text-green-200 text-xs font-medium px-3 py-1.5 rounded-lg">
            <CheckCircle className="w-3.5 h-3.5" /> Downloading
          </span>
        )}

        {/* Dismiss */}
        <button
          onClick={dismiss}
          className="shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
