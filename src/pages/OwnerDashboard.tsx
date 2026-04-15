import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { motion } from 'framer-motion';
import { LogOut, Car, Droplet, Calendar, AlertTriangle, Download, History, Clock, XCircle } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { db, Profile, GlobalSettings, BlacklistEntry, Transaction } from '@/src/lib/db';
import { Shimmer } from '@/src/components/ui/Shimmer';

export default function OwnerDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [blacklistStatus, setBlacklistStatus] = useState<BlacklistEntry | undefined>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [lastTx, setLastTx] = useState<Transaction | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/');
        return;
      }
      const parsedUser = JSON.parse(storedUser) as Profile;
      if (parsedUser.role !== 'owner') {
        navigate('/');
        return;
      }
      
      try {
        const [fetchedSettings, fetchedBlacklist, fetchedTransactions] = await Promise.all([
          db.settings.get(),
          parsedUser.vehicle_no ? db.blacklist.get(parsedUser.vehicle_no) : Promise.resolve(null),
          parsedUser.vehicle_no ? db.transactions.getByVehicle(parsedUser.vehicle_no) : Promise.resolve([])
        ]);

        setUser(parsedUser);
        setSettings(fetchedSettings);
        if (fetchedBlacklist) setBlacklistStatus(fetchedBlacklist);
        setTransactions(fetchedTransactions);
        if (fetchedTransactions.length > 0) setLastTx(fetchedTransactions[0]);
      } catch (err) {
        console.error('Error initializing owner dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadCard = async () => {
    if (cardRef.current) {
      try {
        setIsDownloading(true);
        
        // Use html-to-image which supports modern CSS (Tailwind v4) much better
        const dataUrl = await htmlToImage.toPng(cardRef.current, {
          quality: 1.0,
          pixelRatio: 3, // High resolution
          backgroundColor: '#ffffff',
          style: {
            transform: 'none', // Ensure no scaling issues
          }
        });
        
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `FuelPass-${user?.vehicle_no}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error("Error downloading card:", error);
        alert("কার্ড ডাউনলোড করতে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।");
      } finally {
        setIsDownloading(false);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Shimmer className="h-8 w-48 mb-2" />
              <Shimmer className="h-4 w-32" />
            </div>
            <Shimmer className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              <Shimmer className="h-80 w-full" />
            </div>
            <div className="md:col-span-2 space-y-6">
              <Shimmer className="h-48 w-full" />
              <Shimmer className="h-48 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !settings) return null;

  if (user.status === 'pending') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <Card className="max-w-md w-full text-center p-8 border-yellow-500/30 bg-yellow-500/5">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">অনুমোদনের অপেক্ষায়</h2>
          <p className="text-text-dim mb-8">
            আপনার অ্যাকাউন্টটি বর্তমানে অ্যাডমিন অনুমোদনের অপেক্ষায় আছে। আপনার দেওয়া তথ্য এবং স্মার্ট কার্ড যাচাই করার পর আপনাকে ই-ফুয়েল কার্ড প্রদান করা হবে।
          </p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            লগআউট
          </Button>
        </Card>
      </div>
    );
  }

  if (user.status === 'rejected') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-danger/5 rounded-full blur-3xl pointer-events-none" />
        <Card className="max-w-md w-full text-center p-8 border-danger/30 bg-danger/5">
          <XCircle className="w-16 h-16 text-danger mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">আবেদন বাতিল করা হয়েছে</h2>
          <p className="text-text-dim mb-8">
            দুঃখিত, আপনার দেওয়া তথ্যে অসামঞ্জস্যতা থাকায় আপনার আবেদনটি বাতিল করা হয়েছে। দয়া করে সঠিক তথ্য দিয়ে পুনরায় নিবন্ধন করুন।
          </p>
          <Button variant="outline" onClick={handleLogout} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            লগআউট
          </Button>
        </Card>
      </div>
    );
  }

  const isBlocked = blacklistStatus && new Date(blacklistStatus.blocked_until) > new Date();
  const vehicleQuota = settings.quotas[user.vehicle_type || ''] || { bdt_limit: 0, day_gap: 0 };
  
  let nextRefillDate = null;
  let canRefill = true;
  
  if (lastTx) {
    const lastTxDate = new Date(lastTx.created_at);
    nextRefillDate = new Date(lastTxDate.getTime() + vehicleQuota.day_gap * 24 * 60 * 60 * 1000);
    if (new Date() < nextRefillDate) {
      canRefill = false;
    }
  }

  const needsSlotManagement = ['কোম্পানির ট্রাক', 'বাস', 'প্রাইভেট অ্যাম্বুলেন্স'].includes(user.vehicle_type || '');

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">ড্যাশবোর্ড</h1>
            <p className="text-text-dim">স্বাগতম, {user.full_name}</p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            লগআউট
          </Button>
        </div>

        {isBlocked && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="bg-danger/10 border-danger/30">
              <CardContent className="p-4 flex items-start space-x-4">
                <AlertTriangle className="w-6 h-6 text-danger shrink-0 mt-1" />
                <div>
                  <h3 className="text-danger font-semibold text-lg">আপনার গাড়িটি ব্লক করা হয়েছে</h3>
                  <p className="text-danger/80 text-sm mt-1">কারণ: {blacklistStatus.reason}</p>
                  <p className="text-danger/80 text-sm">ব্লক শেষ হবে: {new Date(blacklistStatus.blocked_until).toLocaleDateString('bn-BD')}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-6">
            <Card className="flex flex-col items-center justify-center p-8 text-center">
              <motion.div 
                className="bg-white p-4 rounded-2xl mb-4 shadow-lg"
                animate={{ 
                  boxShadow: [
                    "0px 0px 0px rgba(100,255,218,0)", 
                    "0px 0px 25px rgba(100,255,218,0.6)", 
                    "0px 0px 0px rgba(100,255,218,0)"
                  ] 
                }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
              >
                <QRCodeSVG 
                  value={JSON.stringify({ v: user.vehicle_no, id: user.id })} 
                  size={180}
                  level="H"
                />
              </motion.div>
              <p className="text-sm text-text-dim mt-2">পাম্পে স্ক্যান করার জন্য এই QR কোডটি দেখান</p>
            </Card>

            <Button onClick={downloadCard} className="w-full" size="lg" disabled={isDownloading}>
              <Download className="w-5 h-5 mr-2" />
              {isDownloading ? 'ডাউনলোড হচ্ছে...' : 'ই-ফুয়েল কার্ড ডাউনলোড করুন'}
            </Button>
          </div>

          <div className="md:col-span-2 space-y-6">
            {/* E-Fuel Card Hidden for Download, but visible in UI as a preview */}
            <div id="fuel-card-preview" className="overflow-hidden rounded-2xl border border-glass-border bg-white text-black relative" ref={cardRef}>
              {/* Card Header */}
              <div className="bg-[#0A5C36] text-white p-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 border-2 border-white rounded-lg flex items-center justify-center">
                    <Droplet className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs opacity-90">ই-ফুয়েল কার্ড / E-FUEL CARD</p>
                    <h2 className="text-xl font-bold">রাজশাহী জেলা প্রশাসন</h2>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-90">কার্ড নং / Card No.</p>
                  <p className="font-bold">{user.id.split('-')[1]?.substring(0,8).toUpperCase() || 'N/A'}</p>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 relative">
                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
                  <Droplet className="w-64 h-64 text-black" />
                </div>

                <div className="flex justify-between items-start mb-6 border-b border-gray-200 pb-4">
                  <div>
                    <p className="text-xs text-gray-500">রেজিস্ট্রেশন নং / Registration No.</p>
                    <h3 className="text-2xl font-bold text-black">{user.vehicle_no}</h3>
                    <p className="text-xs text-gray-500 mt-2">যানের বিবরণ / Vehicle Description</p>
                    <p className="font-bold">{user.vehicle_type || 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">তারিখ / Date</p>
                    <p className="font-bold">{new Date().toLocaleDateString('bn-BD')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                  <div>
                    <p className="text-xs text-gray-500">নাম / Name</p>
                    <p className="font-bold uppercase">{user.full_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">মোবাইল / Mobile</p>
                    <p className="font-bold">{user.mobile}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">রং / Color</p>
                    <p className="font-bold">{user.color || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">পেশা / Profession</p>
                    <p className="font-bold">{user.profession || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">সিসি / CC</p>
                    <p className="font-bold">{user.cc || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">জ্বালানি / Fuel</p>
                    <p className="font-bold">{user.fuel_type || 'N/A'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-6 border-t border-gray-200 pt-4">
                  <div>
                    <p className="text-xs text-gray-500">ইঞ্জিন নং / Engine No.</p>
                    <p className="font-bold">{user.engine_no || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">চ্যাসিস নং / Chassis No.</p>
                    <p className="font-bold">{user.chassis_no || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex justify-between items-end mt-8">
                  <div>
                    <p className="text-xs text-gray-500">ঠিকানা / Address</p>
                    <p className="font-medium text-sm">{user.address || 'N/A'}</p>
                    <p className="text-xs text-gray-400 mt-2">রাজশাহী ফুয়েল পাস — ডিজিটাল তেল বিতরণ ব্যবস্থাপনা সিস্টেম</p>
                  </div>
                  <div className="bg-white p-2 border border-gray-200 rounded-lg">
                    <QRCodeSVG 
                      value={JSON.stringify({ v: user.vehicle_no, id: user.id })} 
                      size={80}
                      level="L"
                    />
                  </div>
                </div>
              </div>
              
              {/* Card Footer */}
              <div className="bg-[#0A5C36] text-white p-2 flex justify-between items-center text-xs px-4">
                <p>রাজশাহী জেলা প্রশাসন</p>
                <p>রাজশাহী.ফুয়েল</p>
              </div>
            </div>

            {needsSlotManagement && (
              <Card className="border-accent-cyan/30 bg-accent-cyan/5">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center text-accent-cyan">
                    <Calendar className="w-5 h-5 mr-2" />
                    স্লট বুকিং (Slot Management)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-text-dim mb-4">কোম্পানির ট্রাক, বাস এবং অ্যাম্বুলেন্সের জন্য অগ্রিম স্লট বুকিং বাধ্যতামূলক।</p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button variant="outline" className="w-full justify-start">
                      <Clock className="w-4 h-4 mr-2" />
                      আজকের স্লট দেখুন
                    </Button>
                    <Button className="w-full">
                      নতুন স্লট বুক করুন
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <Droplet className="w-5 h-5 mr-2 text-accent-cyan" />
                  কোটা স্ট্যাটাস
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-sm text-text-dim">সর্বোচ্চ সীমা</p>
                    <p className="text-2xl font-bold text-success">৳ {vehicleQuota.bdt_limit}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-text-dim">সময়সীমা</p>
                    <p className="text-xl font-semibold text-white">প্রতি {vehicleQuota.day_gap} দিন</p>
                  </div>
                </div>

                {!isBlocked && (
                  <div className={`p-4 rounded-xl border ${canRefill ? 'bg-success/10 border-success/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                    <div className="flex items-center">
                      <Calendar className={`w-5 h-5 mr-3 ${canRefill ? 'text-success' : 'text-yellow-400'}`} />
                      <div>
                        <p className={`font-medium ${canRefill ? 'text-success' : 'text-yellow-400'}`}>
                          {canRefill ? 'আপনি এখন জ্বালানি নিতে পারবেন' : 'পরবর্তী রিফিলের তারিখ'}
                        </p>
                        {!canRefill && nextRefillDate && (
                          <p className="text-sm text-yellow-200/80 mt-1">
                            {nextRefillDate.toLocaleDateString('bn-BD')} এর পর আবার নিতে পারবেন।
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-xl flex items-center">
                  <History className="w-5 h-5 mr-2 text-accent-cyan" />
                  লেনদেনের ইতিহাস
                </CardTitle>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <p className="text-text-dim text-center py-4">কোনো লেনদেন পাওয়া যায়নি।</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                        <div>
                          <p className="font-medium text-white">৳ {tx.amount_bdt}</p>
                          <p className="text-xs text-text-dim">{new Date(tx.created_at).toLocaleString('bn-BD')}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">সফল</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
