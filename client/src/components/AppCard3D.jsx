import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Monitor } from 'lucide-react';
import StarRating from './StarRating';

export default function AppCard3D({ app }) {
  const cardRef = useRef();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glow, setGlow] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const tiltX = ((y - centerY) / centerY) * -10;
    const tiltY = ((x - centerX) / centerX) * 10;
    setTilt({ x: tiltX, y: tiltY });
    setGlow({ x: (x / rect.width) * 100, y: (y / rect.height) * 100 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlow({ x: 50, y: 50 });
  };

  return (
    <Link
      to={`/store/${app.slug}`}
      className="block perspective-[1000px] group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      ref={cardRef}
    >
      <div
        className="card p-5 transition-all duration-200 ease-out relative overflow-hidden"
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) scale3d(1.02, 1.02, 1.02)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Glow effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${glow.x}% ${glow.y}%, rgba(67,97,238,0.08) 0%, transparent 60%)`,
          }}
        />
        
        <div className="flex items-start gap-4 relative z-10">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primer-500 to-primer-700 flex items-center justify-center shrink-0 overflow-hidden shadow-lg shadow-primer-500/20 translate-z-10">
            {app.icon_url ? (
              <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-xl">{app.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-primer-600 transition-colors truncate translate-z-5">
              {app.name}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">{app.developer_name}</p>
            <div className="mt-1.5">
              <StarRating rating={app.rating_avg} size="sm" />
            </div>
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{app.short_description || app.description}</p>
            <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1"><Monitor className="w-3.5 h-3.5" />{app.latest_version?.platform || 'Windows'}</span>
              {app.price > 0 ? <span className="font-semibold text-primer-600">${app.price.toFixed(2)}</span> : <span className="text-green-600 font-medium">Free</span>}
              <span className="flex items-center gap-1 ml-auto"><Download className="w-3.5 h-3.5" />{app.downloads_count.toLocaleString()}</span>
            </div>
            {app.category && (
              <div className="mt-2">
                <span className="inline-block text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{app.category}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
