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
    const base = window.__PRIMERS__?.apiUrl || '/api';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    Promise.all([
      fetch(`${base}/apps?sort=downloads&limit=6`, { signal: controller.signal }).then(r => r.json()),
      fetch(`${base}/apps/categories`, { signal: controller.signal }).then(r => r.json()),
    ]).then(([appsData, catsData]) => {
      setFeaturedApps(appsData.apps || []);
      setCategories(catsData.categories || []);
    }).catch(() => {
      setFeaturedApps([]);
      setCategories([]);
    }).finally(() => {
      clearTimeout(timeout);
      setLoading(false);
    });
  }, []);

  return (
    <div className="bg-[#0a0a0f]">
      {/* Hero with 3D scene */}
      <section className="relative overflow-hidden bg-[#0a0a0f]">
        {/* Ambient background glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primer-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-[400px] h-[400px] bg-purple-600/8 rounded-full blur-[100px]" />
          <div className="dot-grid absolute inset-0 opacity-60" />
        </div>
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Hero3DScene />
          </Suspense>
        </ErrorBoundary>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primer-600/15 border border-primer-500/25 text-primer-400 text-xs font-medium mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-primer-400 animate-pulse" />
                Trusted App Marketplace
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.05]">
                <span className="text-white">Welcome to</span>
                <br />
                <span className="glow-text">Primers Store</span>
              </h1>
              <p className="mt-6 text-lg text-white/60 leading-relaxed max-w-lg">
                Your trusted marketplace for verified applications. Every app goes through rigorous review — quality and safety you can count on.
              </p>
              <div className="flex flex-wrap gap-4 mt-10">
                <Link
                  to="/store"
                  className="bg-primer-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primer-500 transition-all shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 flex items-center gap-2"
                >
                  Browse Apps <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to={user ? '/developer/submit' : '/register'}
                  className="bg-white/8 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl font-semibold border border-white/15 hover:border-white/30 hover:bg-white/12 transition-all flex items-center gap-2"
                >
                  Publish Your App
                </Link>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <div className="relative group">
                <div className="absolute -inset-8 bg-primer-500/15 blur-3xl rounded-full group-hover:bg-primer-500/25 transition-all duration-700" />
                {/* SVG mockup replacing the missing image */}
                <div className="relative w-[340px] lg:w-[420px] rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#13131a] group-hover:border-primer-500/30 transition-all duration-500 group-hover:shadow-glow-lg">
                  {/* Mock window titlebar */}
                  <div className="flex items-center gap-1.5 px-4 py-3 bg-[#0d0d14] border-b border-white/10">
                    <div className="w-3 h-3 rounded-full bg-red-500/70" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                    <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    <div className="ml-4 flex-1 h-5 bg-white/5 rounded border border-white/8 text-[10px] text-white/30 flex items-center px-2">primers.store</div>
                  </div>
                  {/* Mock app grid */}
                  <div className="p-5 grid grid-cols-3 gap-3">
                    {['#5c7cfa','#a855f7','#10b981','#f59e0b','#ef4444','#06b6d4'].map((c, i) => (
                      <div key={i} className="aspect-square rounded-xl flex items-center justify-center text-white font-bold text-xl" style={{ background: `linear-gradient(135deg, ${c}33, ${c}66)`, border: `1px solid ${c}40` }}>
                        <span style={{ color: c }}>{['P','A','B','C','D','E'][i]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="px-5 pb-5 space-y-2">
                    {[80, 60, 70].map((w, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10" />
                        <div className="flex-1 space-y-1">
                          <div className="h-2.5 bg-white/10 rounded" style={{ width: `${w}%` }} />
                          <div className="h-2 bg-white/5 rounded" style={{ width: `${w - 20}%` }} />
                        </div>
                        <div className="w-14 h-6 rounded-lg bg-primer-600/30 border border-primer-500/30" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-white/8 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap justify-center gap-8 sm:gap-16 text-center">
            {[
              { icon: Shield, label: 'Verified Apps', value: 'Every one', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
              { icon: Zap, label: 'Free to Download', value: 'Always', color: 'text-primer-400', bg: 'bg-primer-500/10', border: 'border-primer-500/20' },
              { icon: Users, label: 'Community Rated', value: 'Real reviews', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            ].map(({ icon: Icon, label, value, color, bg, border }) => (
              <div key={label} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl ${bg} border ${border}`}>
                <Icon className={`w-5 h-5 ${color}`} />
                <div className="text-left">
                  <p className="text-xs text-white/40">{label}</p>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16 lg:py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">Why Primers Store?</h2>
          <p className="mt-3 text-white/50">Everything you need in a modern app marketplace</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: Shield, iconColor: 'text-emerald-400', iconBg: 'bg-emerald-500/10 border-emerald-500/20', title: 'Verified Apps', desc: 'Every app is reviewed by our team before publishing. No malware, no surprises.' },
            { icon: Upload, iconColor: 'text-primer-400', iconBg: 'bg-primer-500/10 border-primer-500/20', title: 'Easy Publishing', desc: 'Upload your app, set metadata, and submit for review. We handle distribution.' },
            { icon: Star, iconColor: 'text-purple-400', iconBg: 'bg-purple-500/10 border-purple-500/20', title: 'Community Driven', desc: 'Ratings, reviews, and downloads help surface the best apps.' },
          ].map((f, i) => (
            <div key={i} className="gradient-border text-center p-8 rounded-2xl bg-[#13131a] border border-white/8 hover:border-white/15 transition-all duration-300 group">
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center mx-auto border ${f.iconBg}`}>
                <f.icon className={`w-7 h-7 ${f.iconColor}`} />
              </div>
              <h3 className="mt-5 font-semibold text-lg text-white">{f.title}</h3>
              <p className="mt-2 text-sm text-white/50 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Popular Apps */}
      {!loading && featuredApps.length > 0 && (
        <section className="bg-[#0d0d14] py-16 lg:py-20 border-t border-white/8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-white">Popular Apps</h2>
                <p className="text-white/40 text-sm mt-1">Most downloaded by the community</p>
              </div>
              <Link to="/store" className="text-primer-400 hover:text-primer-300 font-medium text-sm flex items-center gap-1 transition-colors">
                View all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {featuredApps.map(app => <AppCard3D key={app.id} app={app} />)}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primer-900/80 via-[#0a0a0f] to-purple-900/40" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-primer-600/20 rounded-full blur-[80px]" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-16 lg:py-24 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white">Ready to publish your app?</h2>
          <p className="mt-4 text-white/50 max-w-xl mx-auto leading-relaxed">Join developers distributing their apps on Primers Store. Submit for review and reach users directly.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to={user ? '/developer/submit' : '/register'}
              className="bg-primer-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-primer-500 transition-all shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" /> Start Publishing
            </Link>
            <Link
              to="/store"
              className="bg-white/8 backdrop-blur-sm text-white px-8 py-3.5 rounded-xl font-semibold border border-white/15 hover:border-white/30 hover:bg-white/12 transition-all flex items-center gap-2"
            >
              <Download className="w-5 h-5" /> Browse All Apps
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
