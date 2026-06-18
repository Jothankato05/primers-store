import { useState, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppCard3D from '../components/AppCard3D';
import Hero3DScene from '../components/Hero3DScene';
import ErrorBoundary from '../components/ErrorBoundary';
import { Upload, Shield, Download, Star, ArrowRight, Zap, Users } from 'lucide-react';

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
      {/* Hero with 3D scene */}
      <section className="relative bg-gradient-to-br from-gray-50 via-white to-primer-50 overflow-hidden">
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Hero3DScene />
          </Suspense>
        </ErrorBoundary>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight text-gray-900 leading-tight">
                Welcome to<br />
                <span className="text-primer-600">Primers Store</span>
              </h1>
              <p className="mt-6 text-lg text-gray-600 leading-relaxed max-w-lg">
                Your trusted marketplace for verified applications. Every app goes through rigorous review — quality and safety you can count on.
              </p>
              <div className="flex flex-wrap gap-4 mt-8">
                <Link to="/store" className="bg-primer-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primer-700 transition-all shadow-lg shadow-primer-600/25 hover:shadow-xl hover:shadow-primer-600/35 hover:-translate-y-0.5">
                  Browse Apps
                </Link>
                <Link to={user ? '/developer/submit' : '/register'} className="bg-white/80 backdrop-blur-sm text-gray-700 px-8 py-3.5 rounded-xl font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-white transition-all">
                  Publish Your App
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative group">
                <div className="absolute -inset-4 bg-primer-400/20 blur-3xl rounded-full group-hover:bg-primer-400/30 transition-all duration-500" />
                <img
                  src="/primers-mockup.jpg"
                  alt="Primers Store"
                  className="relative rounded-2xl shadow-2xl max-w-full lg:max-w-lg object-cover border-4 border-white/80 group-hover:scale-[1.02] transition-transform duration-500"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Stats strip */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16 text-center">
            {[
              { icon: Shield, label: 'Verified Apps', value: 'Every one', color: 'text-green-500' },
              { icon: Zap, label: 'Free to Download', value: 'Always', color: 'text-primer-600' },
              { icon: Users, label: 'Community Rated', value: 'Real reviews', color: 'text-purple-500' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <div className="text-left">
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-sm font-semibold text-gray-800">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { icon: Shield, bg: 'bg-green-50', border: 'border-green-100', iconColor: 'text-green-600', title: 'Verified Apps', desc: 'Every app is reviewed by our team before publishing. No malware, no surprises.' },
            { icon: Upload, bg: 'bg-primer-50', border: 'border-primer-100', iconColor: 'text-primer-600', title: 'Easy Publishing', desc: 'Upload your app, set metadata, and submit for review. We handle distribution.' },
            { icon: Star, bg: 'bg-purple-50', border: 'border-purple-100', iconColor: 'text-purple-600', title: 'Community Driven', desc: 'Ratings, reviews, and downloads help surface the best apps.' },
          ].map((f, i) => (
            <div key={i} className={`text-center p-8 rounded-2xl border ${f.border} ${f.bg}`}>
              <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center mx-auto shadow-sm">
                <f.icon className={`w-7 h-7 ${f.iconColor}`} />
              </div>
              <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{f.desc}</p>
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{featuredApps.map(app => <AppCard3D key={app.id} app={app} />)}</div>
          </div>
        </section>
      )}
      <section className="bg-gradient-to-br from-primer-600 to-primer-700 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-16 lg:py-20 text-center">
          <h2 className="text-3xl font-bold">Ready to publish your app?</h2>
          <p className="mt-4 text-primer-100 max-w-xl mx-auto">Join developers distributing their apps on Primers Store. Submit for review and reach users directly.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to={user ? '/developer/submit' : '/register'} className="bg-white text-primer-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-primer-50 transition-all shadow-lg hover:-translate-y-0.5 flex items-center gap-2">
              <Upload className="w-5 h-5" /> Start Publishing
            </Link>
            <Link to="/store" className="bg-primer-500/40 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl font-semibold border border-white/20 hover:bg-primer-500/60 transition-all flex items-center gap-2">
              <Download className="w-5 h-5" /> Browse All Apps
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
