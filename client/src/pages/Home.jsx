import { useState, useEffect, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AppCard3D from '../components/AppCard3D';
import Hero3DScene from '../components/Hero3DScene';
import { Upload, Shield, Download, Star, ArrowRight, Monitor } from 'lucide-react';

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
        <Suspense fallback={null}>
          <Hero3DScene />
        </Suspense>
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
                <Link to="/store" className="bg-gray-900 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg shadow-gray-900/20 hover:shadow-xl hover:shadow-gray-900/30 hover:-translate-y-0.5">
                  Get Started
                </Link>
                <Link to="/store" className="bg-white/80 backdrop-blur-sm text-gray-700 px-8 py-3.5 rounded-xl font-semibold border-2 border-gray-300 hover:border-gray-400 hover:bg-white transition-all">
                  Learn More
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
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{featuredApps.map(app => <AppCard3D key={app.id} app={app} />)}</div>
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
