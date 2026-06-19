import { useState } from 'react';
import { Monitor, Download, X, Zap } from 'lucide-react';

const DISMISS_KEY = 'primers_desktop_banner_dismissed';
const DESKTOP_EXE_URL =
  'https://github.com/Jothankato05/primers-store/releases/latest/download/Primers-Store-Setup.exe';

export default function DesktopBanner() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISS_KEY) === '1'
  );

  // Already running inside the Electron app — don't show
  if (window.__PRIMERS__?.isElectron) return null;
  if (dismissed) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <div className="bg-gradient-to-r from-primer-600 to-primer-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-3">
        {/* Icon */}
        <div className="shrink-0 w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center">
          <Monitor className="w-4 h-4" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium leading-snug">
            Get the <span className="font-bold">Primers Store</span> desktop app —
            <span className="hidden sm:inline"> one-click silent installs, no browser needed.</span>
          </p>
        </div>

        {/* Perks — hidden on small screens */}
        <div className="hidden md:flex items-center gap-4 shrink-0 text-xs text-white/80">
          <span className="flex items-center gap-1"><Zap className="w-3.5 h-3.5" /> Silent installs</span>
          <span className="flex items-center gap-1"><Download className="w-3.5 h-3.5" /> Real progress bar</span>
          <span className="flex items-center gap-1"><Monitor className="w-3.5 h-3.5" /> Windows native</span>
        </div>

        {/* Download CTA */}
        <a
          href={DESKTOP_EXE_URL}
          className="shrink-0 flex items-center gap-1.5 bg-white text-primer-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-primer-50 transition-colors"
          onClick={dismiss}
        >
          <Download className="w-3.5 h-3.5" />
          Download App
        </a>

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
