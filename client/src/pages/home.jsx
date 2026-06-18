import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppCard from '../components/AppCard';
import { Search, Upload, Shield, Download, Star, ArrowRight } from 'lucide-react';

export default function Home() {
  const { user } = useAuth();
  const [featuredApps, setFeaturedApps] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/apps?sort=downloads&limit=6').then(r => r.json()),
      fetch('/api/apps/categories').then(r => r.json()),
    ]).then(([appsData, catsData]) => {
      setFeaturedApps(appsData.apps || []);
      setCategories(catsData.categories || []);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="bg-gradient-to-br from-primer-700 via-primer-600 to-primer-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl lg:text-5xl font-bold tracking-tight">
              Discover & distribute <span className="text-primer-200">apps</span> with confidence
            </h1>
            <p className="mt-4 text-lg text-primer-100/90 leading-relaxed">
              Primers Store is your trusted marketplace for applications. Every app goes through our verification process — quality you can trust.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/store" className="inline-flex items-center gap-2 bg-white text-primer-700 px-6 py-3 rounded-lg font-semibold hover:bg-primer-50 transition-colors">
                <Search className="w-5 h-5" /> Browse Store
              </Link>
              {!user && (
                <Link to="/register" className="inline-flex items-center gap-2 bg-primer-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primer-400 transition-colors border border-primer-400">
                  Get Started <ArrowRight className="w-5 h-5" />
                </Link>
              )}
              {(user?.role === 'developer' || user?.role === 'admin') && (
                <Link to="/developer/submit" className="inline-flex items-center gap-2 bg-primer-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primer-400 transition-colors border border-primer-400">
                  <Upload className="w-5 h-5" /> Submit an App
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Shield, color: 'bg-green-100 text-green-600', title: 'Verified Apps', desc: 'Every app is reviewed by our team before publishing. No malware, no surprises.' },
            { icon: Upload, color: 'bg-primer-100 text-primer-600', title: 'Easy Publishing', desc: 'Upload your app, set metadata, and submit for review. We handle distribution.' },
            { icon: Star, color: 'bg-purple-100 text-purple-600', title: 'Community Driven', desc: 'Ratings, reviews, and downloads help surface the best apps.' },
          ].map((f, i) => (
            <div key={i} className="text-center p-6">
              <div className={`w-14 h-14 ${f.color.split(' ')[0]} rounded-xl flex items-center justify-center mx-auto`}>
                <f.icon className={`w-7 h-7 ${f.color.split(' ')[1]}`} />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
      {!loading && featuredApps.length > 0 && (
        <section className="bg-gray-100/50 py-16 lg:py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div><h2 className="text-2xl font-bold">Popular Apps</h2><p className="text-gray-600 text-sm mt-1">Most downloaded</p></div>
              <Link to="/store" className="text-primer-600 hover:text-primer-700 font-medium text-sm flex items-center gap-1">View all <ArrowRight className="w-4 h-4" /></Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{featuredApps.map(app => <AppCard key={app.id} app={app} />)}</div>
          </div>
        </section>
      )}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 lg:py-20 text-center">
        <h2 className="text-3xl font-bold">Ready to publish your app?</h2>
        <p className="mt-4 text-gray-600 max-w-xl mx-auto">Join developers distributing their apps on Primers Store.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to={user ? '/developer/submit' : '/register'} className="btn-primary flex items-center gap-2"><Upload className="w-5 h-5" /> Start Publishing</Link>
          <Link to="/store" className="btn-secondary flex items-center gap-2"><Download className="w-5 h-5" /> Browse All Apps</Link>
        </div>
      </section>
    </div>
  );
}
