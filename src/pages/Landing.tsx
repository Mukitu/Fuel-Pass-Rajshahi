import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Car, Droplet, ShieldCheck, Megaphone, MapPin } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent } from '@/src/components/ui/Card';
import { db, GlobalSettings, Profile } from '@/src/lib/db';

export default function Landing() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [pumps, setPumps] = useState<Profile[]>([]);

  useEffect(() => {
    setSettings(db.settings.get());
    setPumps(db.profiles.getAll().filter(p => p.role === 'operator' && p.status === 'approved'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-cyan/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent-cyan/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent-cyan/20 border border-accent-cyan/50 flex items-center justify-center">
            <Droplet className="w-5 h-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-wide">ফুয়েল পাশ</h1>
            <p className="text-xs text-accent-cyan uppercase tracking-widest">রাজশাহী</p>
          </div>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => navigate('/login')}>
            লগইন
          </Button>
          <Button onClick={() => navigate('/register')}>
            রেজিস্ট্রেশন
          </Button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-sm font-medium mb-8">
            <ShieldCheck className="w-4 h-4" />
            রাজশাহী জেলা প্রশাসন
          </div>
          
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            ডিজিটাল ফুয়েল <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-blue-400">
              ম্যানেজমেন্ট সিস্টেম
            </span>
          </h2>
          
          <p className="text-lg text-text-dim mb-12 max-w-2xl mx-auto leading-relaxed">
            রাজশাহী জেলা প্রশাসনের উদ্যোগে ডিজিটাল পদ্ধতিতে তেল বিতরণ কার্যক্রম। 
            নিরাপদ, স্বচ্ছ এবং কোটা-ভিত্তিক জ্বালানি ব্যবস্থাপনা।
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button size="lg" onClick={() => navigate('/login')} className="text-lg px-8">
              <LogIn className="w-5 h-5 mr-2" />
              লগইন করুন
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/register')} className="text-lg px-8">
              <Car className="w-5 h-5 mr-2" />
              গাড়ি রেজিস্ট্রেশন করুন
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById('pumps-section')?.scrollIntoView({ behavior: 'smooth' });
            }} className="text-lg px-8 border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10">
              <Droplet className="w-5 h-5 mr-2" />
              পাম্প দেখুন
            </Button>
          </div>
        </motion.div>

        {/* Feature Cards */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 w-full max-w-5xl"
        >
          <div className="glass-panel p-6 flex flex-col items-center text-center hover:border-accent-cyan/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center mb-4">
              <Droplet className="w-6 h-6 text-accent-cyan" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">তেল পাম্প দেখুন</h3>
            <p className="text-sm text-text-dim">আপনার নিকটস্থ পাম্পের তথ্য ও স্টক সম্পর্কে জানুন।</p>
          </div>
          
          <div className="glass-panel p-6 flex flex-col items-center text-center hover:border-accent-cyan/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center mb-4">
              <Car className="w-6 h-6 text-accent-cyan" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">গাড়ি রেজিস্ট্রেশন</h3>
            <p className="text-sm text-text-dim">তেল পেতে আপনার গাড়িটি দ্রুত নিবন্ধন করুন।</p>
          </div>

          <div className="glass-panel p-6 flex flex-col items-center text-center hover:border-accent-cyan/50 transition-colors">
            <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center mb-4">
              <ShieldCheck className="w-6 h-6 text-accent-cyan" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">নিরাপদ কোটা</h3>
            <p className="text-sm text-text-dim">স্বচ্ছতার সাথে নির্ধারিত কোটায় জ্বালানি গ্রহণ করুন।</p>
          </div>
        </motion.div>
      </main>

      {/* Pumps Section */}
      <section id="pumps-section" className="py-20 relative z-10 bg-black/20 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">আমাদের পাম্পসমূহ</h2>
            <p className="text-text-dim max-w-2xl mx-auto">রাজশাহী জেলার অনুমোদিত সকল ফুয়েল পাম্পের তালিকা এবং তাদের বর্তমান অবস্থা।</p>
          </div>
          
          {pumps.length === 0 ? (
            <div className="text-center py-12 text-text-dim">
              <p>কোনো অনুমোদিত পাম্প পাওয়া যায়নি।</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pumps.map(pump => (
                <Card key={pump.id} className="bg-white/5 border-white/10 hover:border-accent-cyan/30 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-xl font-bold text-white">{pump.pump_name}</h3>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${pump.is_open !== false ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                        {pump.is_open !== false ? 'খোলা আছে' : 'বন্ধ আছে'}
                      </div>
                    </div>
                    <div className="flex items-start text-text-dim mb-4">
                      <MapPin className="w-4 h-4 mr-2 mt-1 shrink-0" />
                      <span className="text-sm">{pump.location}</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-text-dim">জ্বালানি: </span>
                      <span className="text-white">{pump.fuel_types_sold?.join(', ')}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Marquee Footer */}
      <div className="w-full bg-primary-blue/80 backdrop-blur-md border-t border-glass-border py-3 overflow-hidden z-50 flex items-center">
        <div className="px-4 flex items-center bg-primary-blue z-10 border-r border-glass-border">
          <Megaphone className="w-5 h-5 text-danger mr-2 animate-pulse" />
          <span className="text-white font-bold whitespace-nowrap mr-4">নোটিশ বোর্ড:</span>
        </div>
        <div className="flex-1 overflow-hidden relative flex items-center">
          <div className="animate-marquee text-accent-cyan font-medium text-lg">
            {settings?.marquee_text || "লোড হচ্ছে..."}
          </div>
        </div>
      </div>
    </div>
  );
}
