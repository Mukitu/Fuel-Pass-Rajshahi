import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Car, Droplet, ShieldCheck, Megaphone, MapPin, Activity, History } from 'lucide-react';
import { Button } from '@/src/components/ui/Button';
import { Card, CardContent } from '@/src/components/ui/Card';
import { db, GlobalSettings, Profile, Transaction } from '@/src/lib/db';

export default function Landing() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [pumps, setPumps] = useState<Profile[]>([]);
  const [pumpSales, setPumpSales] = useState<Record<string, { petrol: number, octane: number, diesel: number, total: number }>>({});
  const [stats, setStats] = useState({
    petrol: 0,
    octane: 0,
    diesel: 0,
    totalLiters: 0
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedSettings, allProfiles, allTxs] = await Promise.all([
          db.settings.get(),
          db.profiles.getAll(),
          db.transactions.getAll()
        ]);
        setSettings(fetchedSettings);
        
        const approvedPumps = allProfiles.filter(p => p.role === 'operator' && p.status === 'approved');
        setPumps(approvedPumps);

        // Calculate today's stats
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
        const todays = allTxs.filter(tx => tx.created_at.startsWith(todayStr));
        
        const newStats = { petrol: 0, octane: 0, diesel: 0, totalLiters: 0 };
        const salesByPump: Record<string, { petrol: number, octane: number, diesel: number, total: number }> = {};

        todays.forEach(tx => {
          if (tx.liters) {
            newStats.totalLiters += tx.liters;
            
            if (!salesByPump[tx.pump_id]) {
              salesByPump[tx.pump_id] = { petrol: 0, octane: 0, diesel: 0, total: 0 };
            }
            salesByPump[tx.pump_id].total += tx.liters;
            
            const type = tx.fuel_type?.toLowerCase() || '';
            if (type.includes('petrol')) {
              newStats.petrol += tx.liters;
              salesByPump[tx.pump_id].petrol += tx.liters;
            } else if (type.includes('octane')) {
              newStats.octane += tx.liters;
              salesByPump[tx.pump_id].octane += tx.liters;
            } else if (type.includes('diesel')) {
              newStats.diesel += tx.liters;
              salesByPump[tx.pump_id].diesel += tx.liters;
            }
          }
        });
        setStats(newStats);
        setPumpSales(salesByPump);

      } catch (err) {
        console.error('Error loading landing page data:', err);
      }
    };
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-accent-cyan/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-accent-cyan/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Header / Navbar */}
      <header className="w-full p-4 md:p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-accent-cyan/20 border border-accent-cyan/50 flex items-center justify-center">
            <Droplet className="w-4 h-4 md:w-5 md:h-5 text-accent-cyan" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white tracking-wide">ফুয়েল পাশ</h1>
            <p className="text-[10px] md:text-xs text-accent-cyan uppercase tracking-widest">রাজশাহী</p>
          </div>
        </div>
        <div className="flex gap-2 md:gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-xs md:text-sm">
            লগইন
          </Button>
          <Button size="sm" onClick={() => navigate('/register')} className="text-xs md:text-sm">
            নিবন্ধন
          </Button>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 text-accent-cyan text-[10px] md:text-sm font-medium mb-6 md:mb-8">
            <ShieldCheck className="w-3 h-3 md:w-4 md:h-4" />
            রাজশাহী জেলা প্রশাসন
          </div>
          
          <h2 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 md:mb-6 leading-tight">
            ডিজিটাল ফুয়েল <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-blue-400">
              ম্যানেজমেন্ট সিস্টেম
            </span>
          </h2>
          
          <p className="text-sm md:text-lg text-text-dim mb-8 md:mb-12 max-w-2xl mx-auto leading-relaxed px-4">
            রাজশাহী জেলা প্রশাসনের উদ্যোগে ডিজিটাল পদ্ধতিতে তেল বিতরণ কার্যক্রম। 
            নিরাপদ, স্বচ্ছ এবং কোটা-ভিত্তিক জ্বালানি ব্যবস্থাপনা।
          </p>

          <div className="flex flex-col sm:flex-row gap-3 md:gap-6 justify-center px-4">
            <Button size="lg" onClick={() => navigate('/login')} className="text-base md:text-lg px-6 md:px-8 h-12 md:h-14">
              <LogIn className="w-5 h-5 mr-2" />
              লগইন করুন
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/register')} className="text-base md:text-lg px-6 md:px-8 h-12 md:h-14">
              <Car className="w-5 h-5 mr-2" />
              গাড়ি নিবন্ধন
            </Button>
            <Button size="lg" variant="outline" onClick={() => {
              document.getElementById('pumps-section')?.scrollIntoView({ behavior: 'smooth' });
            }} className="text-base md:text-lg px-6 md:px-8 h-12 md:h-14 border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10">
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
          <div className="glass-panel p-6 flex flex-col items-center text-center border-accent-cyan/20 bg-accent-cyan/5">
            <div className="w-12 h-12 rounded-full bg-accent-cyan/10 flex items-center justify-center mb-4">
              <Activity className="w-6 h-6 text-accent-cyan" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">আজকের বিক্রয় (Liters)</h3>
            <div className="grid grid-cols-3 w-full gap-2 mt-2">
              <div className="text-center">
                <p className="text-[10px] text-text-dim uppercase">পেট্রোল</p>
                <p className="text-sm font-bold text-white">{stats.petrol.toFixed(1)}</p>
              </div>
              <div className="text-center border-x border-white/10">
                <p className="text-[10px] text-text-dim uppercase">অকটেন</p>
                <p className="text-sm font-bold text-white">{stats.octane.toFixed(1)}</p>
              </div>
              <div className="text-center">
                <p className="text-[10px] text-text-dim uppercase">ডিজেল</p>
                <p className="text-sm font-bold text-white">{stats.diesel.toFixed(1)}</p>
              </div>
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pumps.map(pump => (
                <Card key={pump.id} className="bg-white/5 border-white/10 hover:border-accent-cyan/30 transition-all group">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-white group-hover:text-accent-cyan transition-colors">{pump.pump_name}</h3>
                        <div className="flex items-center text-text-dim mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          <span className="text-xs">{pump.location}</span>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${pump.is_open !== false ? 'bg-success/10 text-success border-success/20' : 'bg-danger/10 text-danger border-danger/20'}`}>
                        {pump.is_open !== false ? 'Open' : 'Closed'}
                      </div>
                    </div>
                    
                    <div className="space-y-3 mt-6">
                      <p className="text-xs text-text-dim font-medium uppercase tracking-wider">আজকের বিক্রয় (Liters)</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5">
                          <p className="text-[10px] text-text-dim">পেট্রোল</p>
                          <p className="text-sm font-bold text-white">{pumpSales[pump.id]?.petrol.toFixed(1) || '0.0'} L</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5">
                          <p className="text-[10px] text-text-dim">অকটেন</p>
                          <p className="text-sm font-bold text-white">{pumpSales[pump.id]?.octane.toFixed(1) || '0.0'} L</p>
                        </div>
                        <div className="bg-white/5 p-2 rounded-lg text-center border border-white/5">
                          <p className="text-[10px] text-text-dim">ডিজেল</p>
                          <p className="text-sm font-bold text-white">{pumpSales[pump.id]?.diesel.toFixed(1) || '0.0'} L</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/5 text-[10px] text-text-dim flex justify-between items-center">
                      <span>ট্রেড লাইসেন্স: {pump.trade_license || 'N/A'}</span>
                      <div className="flex flex-col items-end">
                        <span className="text-accent-cyan font-bold mb-1">{pump.fuel_types_sold?.join(', ')}</span>
                        <div className="flex items-center gap-1.5 bg-accent-cyan/10 px-2 py-0.5 rounded text-accent-cyan">
                          <History className="w-3 h-3" />
                          <span className="font-bold">আজকের মোট বিক্রয়: {pumpSales[pump.id]?.total.toFixed(1) || '0.0'} L</span>
                        </div>
                      </div>
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
