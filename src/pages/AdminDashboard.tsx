import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, Settings, ShieldAlert, Activity, Save, Search, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Label } from '@/src/components/ui/Label';
import { db, Profile, GlobalSettings, BlacklistEntry, Transaction } from '@/src/lib/db';
import { Shimmer } from '@/src/components/ui/Shimmer';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [admin, setAdmin] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'settings' | 'transactions'>('settings');
  
  const [settings, setSettings] = useState<GlobalSettings>({ bdt_limit: 0, day_gap: 0, marquee_text: '' });
  const [isSaving, setIsSaving] = useState(false);
  
  const [blacklist, setBlacklist] = useState<BlacklistEntry[]>([]);
  const [blockVehicle, setBlockVehicle] = useState('');
  const [blockDays, setBlockDays] = useState('7');
  const [blockReason, setBlockReason] = useState('');

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txSearch, setTxSearch] = useState('');
  const [txSort, setTxSort] = useState<'newest' | 'oldest'>('newest');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/');
      return;
    }
    const parsedUser = JSON.parse(storedUser) as Profile;
    if (parsedUser.role !== 'admin') {
      navigate('/');
      return;
    }
    
    setTimeout(() => {
      setAdmin(parsedUser);
      setSettings(db.settings.get());
      setBlacklist(db.blacklist.getAll());
      setTransactions(db.transactions.getAll());
      setIsLoading(false);
    }, 1500);
  }, [navigate]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    db.settings.update(settings);
    setTimeout(() => setIsSaving(false), 800);
  };

  const handleBlockVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockVehicle || !blockDays || !blockReason) return;

    const blockedUntil = new Date();
    blockedUntil.setDate(blockedUntil.getDate() + parseInt(blockDays));

    db.blacklist.add({
      vehicle_no: blockVehicle.toUpperCase(),
      blocked_until: blockedUntil.toISOString(),
      reason: blockReason
    });

    setBlacklist(db.blacklist.getAll());
    setBlockVehicle('');
    setBlockReason('');
  };

  const handleUnblock = (vehicle_no: string) => {
    db.blacklist.remove(vehicle_no);
    setBlacklist(db.blacklist.getAll());
  };

  const filteredTransactions = transactions
    .filter(tx => tx.vehicle_no.toLowerCase().includes(txSearch.toLowerCase()) || tx.pump_id.toLowerCase().includes(txSearch.toLowerCase()))
    .sort((a, b) => {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      return txSort === 'newest' ? timeB - timeA : timeA - timeB;
    });

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
        <div className="max-w-5xl mx-auto space-y-6 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Shimmer className="h-8 w-48 mb-2" />
              <Shimmer className="h-4 w-32" />
            </div>
            <Shimmer className="h-10 w-24" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <Shimmer className="h-96 w-full" />
            </div>
            <div className="lg:col-span-2">
              <Shimmer className="h-96 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      <div className="max-w-5xl mx-auto space-y-6 relative z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">DC Office Control</h1>
            <p className="text-text-dim">অ্যাডমিন প্যানেল</p>
          </div>
          <div className="flex gap-4">
            <Button 
              variant={activeTab === 'settings' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('settings')}
            >
              <Settings className="w-4 h-4 mr-2" />
              সেটিংস
            </Button>
            <Button 
              variant={activeTab === 'transactions' ? 'default' : 'outline'} 
              onClick={() => setActiveTab('transactions')}
            >
              <Activity className="w-4 h-4 mr-2" />
              ট্রানজেকশন
            </Button>
            <Button variant="outline" onClick={() => { localStorage.removeItem('user'); navigate('/'); }}>
              <LogOut className="w-4 h-4 mr-2" />
              লগআউট
            </Button>
          </div>
        </div>

        {activeTab === 'settings' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="w-5 h-5 mr-2 text-accent-cyan" />
                  গ্লোবাল কোটা (Global Quota)
                </CardTitle>
                <CardDescription>পুরো জেলার জন্য নিয়ম নির্ধারণ করুন</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div className="space-y-2">
                    <Label>সর্বোচ্চ টাকার সীমা (BDT Limit)</Label>
                    <Input 
                      type="number" 
                      value={settings.bdt_limit}
                      onChange={(e) => setSettings({...settings, bdt_limit: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>সময়সীমা (Time Gap in Days)</Label>
                    <Input 
                      type="number" 
                      value={settings.day_gap}
                      onChange={(e) => setSettings({...settings, day_gap: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>নোটিশ বোর্ডের লেখা (Marquee Text)</Label>
                    <textarea 
                      className="flex w-full rounded-xl glass-input px-4 py-3 text-sm outline-none min-h-[100px] resize-y"
                      value={settings.marquee_text}
                      onChange={(e) => setSettings({...settings, marquee_text: e.target.value})}
                      placeholder="Enter scrolling text for the landing page..."
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSaving}>
                    {isSaving ? 'সংরক্ষণ হচ্ছে...' : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        সংরক্ষণ করুন
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center text-danger">
                  <ShieldAlert className="w-5 h-5 mr-2" />
                  পেনাল্টি / ব্লকলিস্ট সিস্টেম
                </CardTitle>
                <CardDescription>নিয়ম ভঙ্গকারী গাড়ি ব্লক করুন</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleBlockVehicle} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2 md:col-span-1">
                    <Label>গাড়ির নম্বর</Label>
                    <Input 
                      placeholder="RAJ-H-..." 
                      value={blockVehicle}
                      onChange={(e) => setBlockVehicle(e.target.value)}
                      className="uppercase"
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>কত দিন (Days)</Label>
                    <Input 
                      type="number" 
                      value={blockDays}
                      onChange={(e) => setBlockDays(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-1">
                    <Label>কারণ (Reason)</Label>
                    <Input 
                      placeholder="e.g. Rule Violation" 
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" variant="danger" className="md:col-span-1">
                    ব্লক করুন
                  </Button>
                </form>

                <div className="mt-6">
                  <h4 className="text-sm font-medium text-text-dim mb-3">বর্তমান ব্লকলিস্ট</h4>
                  {blacklist.length === 0 ? (
                    <p className="text-sm text-text-dim/50 italic">কোনো গাড়ি ব্লকলিস্টে নেই।</p>
                  ) : (
                    <div className="space-y-2">
                      {blacklist.map((entry) => {
                        const isExpired = new Date(entry.blocked_until) < new Date();
                        return (
                          <div key={entry.vehicle_no} className="flex justify-between items-center p-3 rounded-lg bg-white/5 border border-white/10">
                            <div>
                              <p className="font-medium text-white">{entry.vehicle_no}</p>
                              <p className="text-xs text-text-dim">কারণ: {entry.reason} • শেষ হবে: {new Date(entry.blocked_until).toLocaleDateString('bn-BD')}</p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleUnblock(entry.vehicle_no)}
                              className={isExpired ? 'border-success/50 text-success hover:bg-success/20' : ''}
                            >
                              {isExpired ? 'আনব্লক করুন' : 'বাতিল করুন'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeTab === 'transactions' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-accent-cyan" />
                      সকল ট্রানজেকশন
                    </CardTitle>
                    <CardDescription>সিস্টেমের সমস্ত জ্বালানি বিতরণের রেকর্ড</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
                      <Input 
                        placeholder="গাড়ির নম্বর বা পাম্প আইডি..." 
                        className="pl-9 w-full md:w-64"
                        value={txSearch}
                        onChange={(e) => setTxSearch(e.target.value)}
                      />
                    </div>
                    <select 
                      className="flex h-10 rounded-xl glass-input px-3 py-2 text-sm outline-none appearance-none cursor-pointer"
                      value={txSort}
                      onChange={(e) => setTxSort(e.target.value as 'newest' | 'oldest')}
                    >
                      <option value="newest" className="bg-primary-blue">নতুন থেকে পুরানো</option>
                      <option value="oldest" className="bg-primary-blue">পুরানো থেকে নতুন</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 text-text-dim text-sm">
                        <th className="pb-3 font-medium">তারিখ ও সময়</th>
                        <th className="pb-3 font-medium">গাড়ির নম্বর</th>
                        <th className="pb-3 font-medium">পরিমাণ (BDT)</th>
                        <th className="pb-3 font-medium">পাম্প অপারেটর</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-text-dim">কোনো ট্রানজেকশন পাওয়া যায়নি।</td>
                        </tr>
                      ) : (
                        filteredTransactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 text-sm text-white">
                              {new Date(tx.created_at).toLocaleString('bn-BD')}
                            </td>
                            <td className="py-3 font-medium text-accent-cyan">{tx.vehicle_no}</td>
                            <td className="py-3 text-white font-semibold">৳ {tx.amount_bdt}</td>
                            <td className="py-3 text-sm text-text-dim">{tx.pump_id}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
