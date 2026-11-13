import { Link } from 'react-router-dom';

const col = { display: 'grid', gap: 8, alignContent: 'start' };
const head = { fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-strong)', margin: '0 0 2px' };
const a = { fontSize: '0.8125rem', color: 'var(--text-muted)', textDecoration: 'none' };

export default function Footer() {
  return (
    <footer style={{ background: '#f5f5f7', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6" style={{ paddingTop: 32, paddingBottom: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 24 }}>
          <div style={col}>
            <p style={head}>Discover</p>
            <Link to="/store" style={a}>All apps</Link>
            <Link to="/store?sort=newest" style={a}>New releases</Link>
            <Link to="/store?sort=rating" style={a}>Highest rated</Link>
          </div>
          <div style={col}>
            <p style={head}>Developers</p>
            <Link to="/developer/submit" style={a}>Publish an app</Link>
            <Link to="/developer" style={a}>Developer console</Link>
          </div>
          <div style={col}>
            <p style={head}>Primers</p>
            <a href="https://primersgroup.ng" style={a} target="_blank" rel="noopener noreferrer">Primers Group</a>
            <a href="https://id.primersgroup.ng" style={a} target="_blank" rel="noopener noreferrer">Primers ID</a>
            <a href="https://primersgroup.ng/status/" style={a} target="_blank" rel="noopener noreferrer">Status</a>
          </div>
          <div style={col}>
            <p style={head}>Help</p>
            <a href="mailto:primerscorperation@gmail.com" style={a}>Contact</a>
            <Link to="/privacy" style={a}>Privacy</Link>
          </div>
        </div>
        <p style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
          © 2026 Primers Group, Abuja, Nigeria. Every app on Primers Store is reviewed before it is published.
        </p>
      </div>
    </footer>
  );
}
