export default function LoadingScreen() {
  return (
    <div role="status" aria-label="Loading" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <div style={{ width: 28, height: 28, border: '2.5px solid #e5e5ea', borderTopColor: 'var(--text-muted)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
