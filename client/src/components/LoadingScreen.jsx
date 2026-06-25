export default function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-page)' }}>
      <div style={{ textAlign: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ margin: '0 auto 1.5rem' }}>
          <defs>
            <linearGradient id="lsLogoGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#748ffc" />
              <stop offset="100%" stopColor="#a855f7" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="8" fill="url(#lsLogoGrad)" />
          <text x="8" y="24" fontFamily="Quicksand, Manrope, sans-serif" fontWeight="700" fontSize="20" fill="white">P</text>
        </svg>
        <div style={{ width: 32, height: 32, border: '3px solid rgba(92,124,250,0.2)', borderTopColor: '#5c7cfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Loading...</p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
