import { Link } from 'react-router-dom';
import { Download, Star, Monitor, Smartphone, Globe, Apple } from 'lucide-react';
import StarRating from './StarRating';

const platformIcons = {
  windows: Monitor,
  macos: Apple,
  linux: Monitor,
  android: Smartphone,
  ios: Smartphone,
  web: Globe,
};

export default function AppCard({ app }) {
  const PlatformIcon = platformIcons[app.latest_version?.platform] || Monitor;

  return (
    <Link to={`/store/${app.slug}`} className="card p-5 block group">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primer-500 to-primer-700 flex items-center justify-center shrink-0 overflow-hidden">
          {app.icon_url ? (
            <img src={app.icon_url} alt={app.name} className="w-full h-full object-cover" />
          ) : (
            <span className="text-white font-bold text-xl">{app.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 group-hover:text-primer-600 transition-colors truncate">
            {app.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{app.developer_name}</p>
          <div className="mt-1.5">
            <StarRating rating={app.rating_avg} size="sm" />
          </div>
          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{app.short_description || app.description}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <PlatformIcon className="w-3.5 h-3.5" />
              {app.latest_version?.platform || 'Windows'}
            </span>
            {app.price > 0 ? (
              <span className="font-semibold text-primer-600">${app.price.toFixed(2)}</span>
            ) : (
              <span className="text-green-600 font-medium">Free</span>
            )}
            <span className="flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />
              {app.downloads_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
