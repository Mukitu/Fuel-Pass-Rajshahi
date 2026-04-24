import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ScanLine, Search, CheckCircle2, XCircle, AlertTriangle, QrCode, Clock, Droplet } from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Label } from '@/src/components/ui/Label';
import { db, Profile, GlobalSettings, Transaction } from '@/src/lib/db';
import { Shimmer } from '@/src/components/ui/Shimmer';

export default function OperatorDashboard() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<GlobalSettings | null>(null);
  const [todaysTransactions, setTodaysTransactions] = useState<Transaction[]>([]);
  const [transactionOwners, setTransactionOwners] = useState<Record<string, Profile>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  const [searchVehicle, setSearchVehicle] = useState('');
  const [scannedVehicle, setScannedVehicle] = useState<Profile | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  
  const [validationStatus, setValidationStatus] = useState<'idle' | 'valid' | 'blocked' | 'gap_error' | 'not_found'>('idle');
  const [validationMessage, setValidationMessage] = useState('');
  
  const [amount, setAmount] = useState('');
  const [liters, setLiters] = useState('');
  const [selectedFuelType, setSelectedFuelType] = useState('');
  const [txSuccess, setTxSuccess] = useState(false);

  const [prices, setPrices] = useState({
    petrol: operator?.petrol_price || 0,
    octane: operator?.octane_price || 0,
    diesel: operator?.diesel_price || 0
  });

  useEffect(() => {
    if (operator) {
      setPrices({
        petrol: operator.petrol_price || 0,
        octane: operator.octane_price || 0,
        diesel: operator.diesel_price || 0
      });
    }
  }, [operator]);

  useEffect(() => {
    const init = async () => {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) {
        navigate('/');
        return;
      }
      const parsedUser = JSON.parse(storedUser) as Profile;
      if (parsedUser.role !== 'operator') {
        navigate('/');
        return;
      }
      
      try {
        const [fetchedSettings, allTxs, allProfiles] = await Promise.all([
          db.settings.get(),
          db.transactions.getAll(),
          db.profiles.getAll()
        ]);
        
        setOperator(parsedUser);
        setSettings(fetchedSettings);
        
        const todayStr = new Date().toISOString().split('T')[0];
        const todays = allTxs.filter(tx => 
          tx.pump_id === parsedUser.id && 
          tx.created_at.startsWith(todayStr)
        );
        setTodaysTransactions(todays);

        // Create a map of vehicle_no to profile for quick lookup
        const ownerMap: Record<string, Profile> = {};
        allProfiles.forEach(p => {
          if (p.vehicle_no) ownerMap[p.vehicle_no] = p;
        });
        setTransactionOwners(ownerMap);
      } catch (err) {
        console.error('Error initializing operator dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [navigate]);

  const executeSearch = async (vehicleNo: string) => {
    setIsSearching(true);
    setTxSuccess(false);
    setAmount('');
    setValidationStatus('idle');
    setValidationMessage('');
    
    try {
      const vehicle = await db.profiles.getByVehicle(vehicleNo.toUpperCase());
      if (!vehicle) {
        setValidationStatus('not_found');
        setValidationMessage('দুঃখিত, এই গাড়িটি নিবন্ধিত নয়। (Vehicle not registered)');
        setScannedVehicle(null);
        setIsSearching(false);
        return;
      }

      setScannedVehicle(vehicle);
      await validateVehicle(vehicle);
    } catch (err) {
      console.error('Error searching vehicle:', err);
      setValidationStatus('not_found');
      setValidationMessage('গাড়িটি খোঁজার সময় একটি সমস্যা হয়েছে।');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchVehicle) return;
    executeSearch(searchVehicle);
  };

  const handleScan = (text: string) => {
    try {
      const data = JSON.parse(text);
      if (data.v) {
        setSearchVehicle(data.v);
        setShowScanner(false);
        executeSearch(data.v);
      }
    } catch (e) {
      // If not JSON, maybe it's just the raw string
      setSearchVehicle(text);
      setShowScanner(false);
      executeSearch(text);
    }
  };

  const validateVehicle = async (vehicle: Profile) => {
    if (!settings || !operator) return;

    // 0. Check if pump is open
    if (operator.is_open === false) {
      setValidationStatus('blocked');
      setValidationMessage('দুঃখিত, আপনার পাম্পটি বর্তমানে বন্ধ আছে। আপনি এখন তেল বিক্রি করতে পারবেন না।');
      return;
    }

    // 1. Check Approval Status
    if (vehicle.status !== 'approved') {
      setValidationStatus('blocked');
      setValidationMessage('এই গাড়িটির নিবন্ধন এখনো অ্যাডমিন কর্তৃক অনুমোদিত হয়নি বা বাতিল করা হয়েছে।');
      return;
    }

    // 2. Check Blacklist
    const blacklistEntry = await db.blacklist.get(vehicle.vehicle_no!);
    if (blacklistEntry && new Date(blacklistEntry.blocked_until) > new Date()) {
      setValidationStatus('blocked');
      setValidationMessage(`দুঃখিত, এই গাড়িটি ব্লক করা হয়েছে। কারণ: ${blacklistEntry.reason}`);
      return;
    }

    const vehicleQuota = settings.quotas[vehicle.vehicle_type || ''] || { bdt_limit: 0, day_gap: 0 };

    // 3. Check Time Gap
    const txs = await db.transactions.getByVehicle(vehicle.vehicle_no!);
    if (txs.length > 0) {
      const lastTxDate = new Date(txs[0].created_at);
      const nextRefillDate = new Date(lastTxDate.getTime() + vehicleQuota.day_gap * 24 * 60 * 60 * 1000);
      
      if (new Date() < nextRefillDate) {
        const penaltyDays = settings.auto_penalty_days || 0;
        if (penaltyDays > 0) {
          const blockedUntil = new Date();
          blockedUntil.setDate(blockedUntil.getDate() + penaltyDays);
          await db.blacklist.add({
            vehicle_no: vehicle.vehicle_no!,
            blocked_until: blockedUntil.toISOString(),
            reason: 'নির্ধারিত সময়ের আগে তেল নেওয়ার চেষ্টা (Quota Violation)'
          });
          setValidationStatus('blocked');
          setValidationMessage(`সতর্কতা: নির্ধারিত সময়ের আগে তেল নেওয়ার চেষ্টার কারণে গাড়িটি স্বয়ংক্রিয়ভাবে ${penaltyDays} দিনের জন্য ব্লক করা হয়েছে!`);
        } else {
          setValidationStatus('gap_error');
          setValidationMessage(`আপনি ${lastTxDate.toLocaleDateString('bn-BD')} তারিখে তেল নিয়েছেন, আপনি আবার ${nextRefillDate.toLocaleDateString('bn-BD')} তারিখে তেল পাবেন।`);
        }
        return;
      }
    }

    setValidationStatus('valid');
    setValidationMessage('গাড়িটি জ্বালানি নেওয়ার জন্য উপযুক্ত।');
    // Set default fuel type based on vehicle if available or first available
    setSelectedFuelType(vehicle.fuel_type || 'Petrol');
  };

  const handlePriceUpdate = async () => {
    if (!operator) return;
    try {
      await db.profiles.update(operator.id, {
        petrol_price: Number(prices.petrol),
        octane_price: Number(prices.octane),
        diesel_price: Number(prices.diesel)
      });
      // Update local storage too to keep it in sync
      const updatedOperator = { 
        ...operator, 
        petrol_price: Number(prices.petrol),
        octane_price: Number(prices.octane),
        diesel_price: Number(prices.diesel)
      };
      localStorage.setItem('user', JSON.stringify(updatedOperator));
      setOperator(updatedOperator);
      alert('মূল্য সফলভাবে আপডেট করা হয়েছে।');
    } catch (err) {
      console.error('Error updating prices:', err);
      alert('মূল্য আপডেট করার সময় সমস্যা হয়েছে।');
    }
  };

  const calculateFromAmount = (val: string) => {
    setAmount(val);
    const numAmt = Number(val);
    const price = getPriceForType(selectedFuelType);
    if (price > 0 && numAmt > 0) {
      setLiters((numAmt / price).toFixed(2));
    } else {
      setLiters('');
    }
  };

  const calculateFromLiters = (val: string) => {
    setLiters(val);
    const numLiters = Number(val);
    const price = getPriceForType(selectedFuelType);
    if (price > 0 && numLiters > 0) {
      setAmount((numLiters * price).toFixed(0));
    } else {
      setAmount('');
    }
  };

  const getPriceForType = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('petrol')) return prices.petrol;
    if (t.includes('octane')) return prices.octane;
    if (t.includes('diesel')) return prices.diesel;
    return 0;
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannedVehicle || !operator || validationStatus !== 'valid' || !settings) return;

    const vehicleQuota = settings.quotas[scannedVehicle.vehicle_type || ''] || { bdt_limit: 0, day_gap: 0 };
    const numAmount = Number(amount);
    const numLiters = Number(liters);

    if (numAmount <= 0 || numAmount > vehicleQuota.bdt_limit) {
      alert(`পরিমাণ 0 থেকে ${vehicleQuota.bdt_limit} টাকার মধ্যে হতে হবে।`);
      return;
    }

    try {
      const newTx = await db.transactions.add({
        vehicle_no: scannedVehicle.vehicle_no!,
        amount_bdt: numAmount,
        liters: numLiters,
        fuel_type: selectedFuelType,
        pump_id: operator.id,
        pump_name: operator.pump_name
      });

      setTodaysTransactions(prev => [newTx, ...prev]);
      setTxSuccess(true);
      setTimeout(() => {
        setSearchVehicle('');
        setScannedVehicle(null);
        setValidationStatus('idle');
        setTxSuccess(false);
        setAmount('');
        setLiters('');
      }, 3000);
    } catch (err) {
      console.error('Error processing transaction:', err);
      alert('লেনদেন সম্পন্ন করার সময় একটি সমস্যা হয়েছে।');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
        <div className="max-w-3xl mx-auto space-y-6 relative z-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <Shimmer className="h-8 w-48 mb-2" />
              <Shimmer className="h-4 w-32" />
            </div>
            <Shimmer className="h-10 w-24" />
          </div>
          <Shimmer className="h-48 w-full" />
        </div>
      </div>
    );
  }

  if (!operator || !settings) return null;

  if (operator.status === 'pending') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-accent-cyan/5 rounded-full blur-3xl pointer-events-none" />
        <Card className="max-w-md w-full text-center p-8 border-yellow-500/30 bg-yellow-500/5">
          <Clock className="w-16 h-16 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">অনুমোদনের অপেক্ষায়</h2>
          <p className="text-text-dim mb-8">
            আপনার পাম্প অ্যাকাউন্টটি বর্তমানে ডিসি স্যারের অনুমোদনের অপেক্ষায় আছে। অনুমোদন পাওয়ার পর আপনি কার্যক্রম শুরু করতে পারবেন।
          </p>
          <Button variant="outline" onClick={() => { localStorage.removeItem('user'); navigate('/'); }} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            লগআউট
          </Button>
        </Card>
      </div>
    );
  }

  if (operator.status === 'rejected') {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-danger/5 rounded-full blur-3xl pointer-events-none" />
        <Card className="max-w-md w-full text-center p-8 border-danger/30 bg-danger/5">
          <XCircle className="w-16 h-16 text-danger mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">আবেদন বাতিল করা হয়েছে</h2>
          <p className="text-text-dim mb-8">
            দুঃখিত, আপনার পাম্পের আবেদনটি বাতিল করা হয়েছে।
          </p>
          <Button variant="outline" onClick={() => { localStorage.removeItem('user'); navigate('/'); }} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            লগআউট
          </Button>
        </Card>
      </div>
    );
  }

  if (operator.is_open === false) {
    return (
      <div className="min-h-screen p-4 md:p-8 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-danger/5 rounded-full blur-3xl pointer-events-none" />
        <Card className="max-w-md w-full text-center p-8 border-danger/30 bg-danger/5">
          <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-6" />
          <h2 className="text-2xl font-bold text-white mb-4">পাম্প বন্ধ আছে</h2>
          <p className="text-text-dim mb-8">
            অ্যাডমিন কর্তৃক আপনার পাম্পটি বর্তমানে বন্ধ রাখা হয়েছে। আপনি এখন কোনো তেল বিক্রি করতে পারবেন না।
          </p>
          <Button variant="outline" onClick={() => { localStorage.removeItem('user'); navigate('/'); }} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            লগআউট
          </Button>
        </Card>
      </div>
    );
  }

  const todayStats = todaysTransactions.reduce((acc, tx) => {
    acc.total += tx.amount_bdt;
    const type = tx.fuel_type?.toLowerCase() || '';
    if (type.includes('petrol')) acc.petrol += tx.liters || 0;
    else if (type.includes('octane')) acc.octane += tx.liters || 0;
    else if (type.includes('diesel')) acc.diesel += tx.liters || 0;
    return acc;
  }, { total: 0, petrol: 0, octane: 0, diesel: 0 });

  return (
    <div className="min-h-screen p-3 md:p-8 relative overflow-hidden">
      <div className="max-w-4xl mx-auto space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">SMARTRefill</h1>
            <p className="text-text-dim text-sm">পাম্প: {operator.pump_name} • অপারেটর: {operator.full_name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem('user'); navigate('/'); }} className="w-full md:w-auto">
            <LogOut className="w-4 h-4 mr-2" />
            লগআউট
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-accent-cyan/5 border-accent-cyan/20">
            <CardContent className="p-4">
              <p className="text-[10px] md:text-xs text-text-dim uppercase mb-1">মোট বিক্রি (আজ)</p>
              <p className="text-lg md:text-xl font-bold text-accent-cyan">৳ {todayStats.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <p className="text-[10px] md:text-xs text-text-dim uppercase mb-1">পেট্রোল বিক্রি</p>
              <p className="text-lg md:text-xl font-bold text-white">{todayStats.petrol.toFixed(1)} L</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <p className="text-[10px] md:text-xs text-text-dim uppercase mb-1">অকটেন বিক্রি</p>
              <p className="text-lg md:text-xl font-bold text-white">{todayStats.octane.toFixed(1)} L</p>
            </CardContent>
          </Card>
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              <p className="text-[10px] md:text-xs text-text-dim uppercase mb-1">ডিজেল বিক্রি</p>
              <p className="text-lg md:text-xl font-bold text-white">{todayStats.diesel.toFixed(1)} L</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center text-lg md:text-xl">
                  <ScanLine className="w-5 h-5 mr-2 text-accent-cyan" />
                  গাড়ি অনুসন্ধান ও ফুয়েল রিফিল
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-6">
                  <Input 
                    placeholder="গাড়ির রেজিস্ট্রেশন নম্বর (যেমন: ঢাকা মেট্রো-ক-১১-২২৩৩)" 
                    value={searchVehicle}
                    onChange={(e) => setSearchVehicle(e.target.value)}
                    className="flex-1 uppercase h-12 text-lg font-mono tracking-wider"
                  />
                  <div className="flex gap-2">
                    <Button type="submit" disabled={isSearching} className="flex-1 sm:flex-none h-12 px-6">
                      <Search className="w-4 h-4 mr-2" />
                      অনুসন্ধান
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setShowScanner(!showScanner)} className="h-12 w-12 p-0 border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10">
                      <QrCode className="w-5 h-5" />
                    </Button>
                  </div>
                </form>

                <AnimatePresence>
                  {validationStatus === 'not_found' && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                      className="p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center mb-4"
                    >
                      <XCircle className="w-5 h-5 mr-3" />
                      {validationMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {showScanner && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} 
                      animate={{ opacity: 1, height: 'auto' }} 
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 overflow-hidden rounded-xl border border-glass-border bg-black/40"
                    >
                      <Scanner 
                        onScan={(result) => {
                          if (result && result.length > 0) {
                            handleScan(result[0].rawValue);
                          }
                        }}
                        components={{ finder: false }}
                      />
                      <div className="p-3 bg-black/60 text-center text-xs text-text-dim flex items-center justify-center gap-2">
                        <ScanLine className="w-3 h-3 animate-pulse" />
                        কিউআর কোডটি ক্যামেরার সামনে ধরুন
                        <Button variant="ghost" size="sm" onClick={() => setShowScanner(false)} className="h-6 px-2 text-xs">বন্ধ করুন</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {isSearching ? (
                    <div className="py-8">
                      <Shimmer className="h-48 w-full" />
                    </div>
                  ) : scannedVehicle ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }} 
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6"
                    >
                      <div className={`p-6 rounded-2xl border transition-all duration-500 ${
                        validationStatus === 'valid' ? 'bg-success/5 border-success/30 shadow-[0_0_20px_rgba(0,230,118,0.05)]' :
                        validationStatus === 'blocked' ? 'bg-danger/5 border-danger/30 shadow-[0_0_20px_rgba(255,77,77,0.05)]' :
                        'bg-yellow-500/5 border-yellow-500/30'
                      }`}>
                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 ${
                            validationStatus === 'valid' ? 'bg-success/20 text-success' :
                            validationStatus === 'blocked' ? 'bg-danger/20 text-danger' :
                            'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {validationStatus === 'valid' ? <CheckCircle2 className="w-10 h-10" /> :
                             validationStatus === 'blocked' ? <XCircle className="w-10 h-10" /> :
                             <AlertTriangle className="w-10 h-10" />}
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                              <h3 className="text-2xl font-bold text-white font-mono">{scannedVehicle.vehicle_no}</h3>
                              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] text-text-dim w-fit mx-auto sm:mx-0">{scannedVehicle.vehicle_type}</span>
                            </div>
                            <p className="text-text-dim text-sm mb-4">মালিক: {scannedVehicle.full_name} • মোবাইল: {scannedVehicle.mobile}</p>
                            
                            <div className={`p-4 rounded-xl text-sm font-medium ${
                              validationStatus === 'valid' ? 'bg-success/10 text-success border border-success/20' :
                              validationStatus === 'blocked' ? 'bg-danger/10 text-danger border border-danger/20' :
                              'bg-yellow-500/10 text-yellow-200 border border-yellow-500/20'
                            }`}>
                              {validationMessage}
                            </div>
                          </div>
                        </div>
                      </div>

                      {validationStatus === 'valid' && !txSuccess && (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {['Petrol', 'Octane', 'Diesel'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setSelectedFuelType(type);
                                  if (amount) {
                                    const price = type.toLowerCase() === 'petrol' ? prices.petrol : 
                                                  type.toLowerCase() === 'octane' ? prices.octane : prices.diesel;
                                    if (price > 0) setLiters((Number(amount) / price).toFixed(2));
                                  }
                                }}
                                className={`flex flex-col items-center justify-center py-4 px-3 rounded-2xl border transition-all duration-300 ${
                                  selectedFuelType === type 
                                    ? 'bg-accent-cyan/10 border-accent-cyan text-accent-cyan shadow-[0_0_15px_rgba(100,255,218,0.1)]' 
                                    : 'bg-white/5 border-white/10 text-text-dim hover:bg-white/10'
                                }`}
                              >
                                <Droplet className={`w-6 h-6 mb-2 ${selectedFuelType === type ? 'text-accent-cyan' : 'text-text-dim'}`} />
                                <span className="font-bold text-sm">{type === 'Petrol' ? 'পেট্রোল' : type === 'Octane' ? 'অকটেন' : 'ডিজেল'}</span>
                                <span className="text-[10px] mt-1">৳ {getPriceForType(type)}/L</span>
                              </button>
                            ))}
                          </div>

                          <Card className="border-accent-cyan/10 bg-accent-cyan/5">
                            <CardContent className="p-6">
                              <form onSubmit={handleTransaction} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                  <div className="space-y-2">
                                    <Label className="text-text-dim">টাকার পরিমাণ (BDT)</Label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim">৳</span>
                                      <Input 
                                        type="number" 
                                        placeholder="0" 
                                        value={amount}
                                        onChange={(e) => calculateFromAmount(e.target.value)}
                                        max={settings.quotas[scannedVehicle.vehicle_type || '']?.bdt_limit || 0}
                                        className="pl-8 h-12 text-xl font-bold bg-white/5"
                                        required
                                      />
                                    </div>
                                    <p className="text-[10px] text-text-dim">সর্বোচ্চ সীমা: ৳ {settings.quotas[scannedVehicle.vehicle_type || '']?.bdt_limit || 0}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <Label className="text-text-dim">পরিমাণ (Liters)</Label>
                                    <div className="relative">
                                      <Input 
                                        type="number" 
                                        step="0.01"
                                        placeholder="0.00" 
                                        value={liters}
                                        onChange={(e) => calculateFromLiters(e.target.value)}
                                        className="h-12 text-xl font-bold bg-white/5"
                                        required
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim">L</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <Button type="submit" className="w-full h-14 text-lg font-bold shadow-lg shadow-accent-cyan/10" size="lg">
                                  রিফিল নিশ্চিত করুন
                                </Button>
                              </form>
                            </CardContent>
                          </Card>
                        </div>
                      )}

                      {txSuccess && (
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                          <Card className="bg-success/20 border-success/40 py-8 text-center">
                            <CardContent>
                              <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-success/30">
                                <CheckCircle2 className="w-12 h-12 text-success animate-bounce" />
                              </div>
                              <h3 className="text-2xl font-bold text-white mb-2">লেনদেন সফল!</h3>
                              <p className="text-success font-medium">গাড়ি: {scannedVehicle.vehicle_no}</p>
                              <div className="mt-4 flex justify-center gap-6 text-sm">
                                <div>
                                  <p className="text-text-dim uppercase text-[10px]">টাকা</p>
                                  <p className="text-white font-bold text-lg">৳ {amount}</p>
                                </div>
                                <div className="w-px h-10 bg-white/10" />
                                <div>
                                  <p className="text-text-dim uppercase text-[10px]">লিটার</p>
                                  <p className="text-white font-bold text-lg">{liters} L</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">আজকের লেনদেনের তালিকা</CardTitle>
                <CardDescription>আপনার পাম্পের সর্বশেষ ১০টি লেনদেন</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-text-dim text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4 text-left font-medium">সময়</th>
                        <th className="px-6 py-4 text-left font-medium">গাড়ির নম্বর</th>
                        <th className="px-6 py-4 text-left font-medium">জ্বালানি</th>
                        <th className="px-6 py-4 text-right font-medium">টাকা</th>
                        <th className="px-6 py-4 text-right font-medium">লিটার</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {todaysTransactions.slice(0, 10).map((tx) => (
                        <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 text-text-dim">{new Date(tx.created_at).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</td>
                          <td className="px-6 py-4 font-mono font-bold text-white">{tx.vehicle_no}</td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20">
                              {tx.fuel_type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-success">৳ {tx.amount_bdt}</td>
                          <td className="px-6 py-4 text-right text-text-dim">{tx.liters} L</td>
                        </tr>
                      ))}
                      {todaysTransactions.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-text-dim italic">
                            আজ কোনো লেনদেন হয়নি।
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-accent-cyan/30 bg-accent-cyan/5">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <Droplet className="w-5 h-5 mr-2 text-accent-cyan" />
                  জ্বালানি মূল্য
                </CardTitle>
                <CardDescription>প্রতি লিটারের বর্তমান বাজার মূল্য</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-text-dim">পেট্রোল (Petrol)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        value={prices.petrol} 
                        onChange={(e) => setPrices({...prices, petrol: Number(e.target.value)})}
                        className="bg-white/5"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-text-dim">অকটেন (Octane)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        value={prices.octane} 
                        onChange={(e) => setPrices({...prices, octane: Number(e.target.value)})}
                        className="bg-white/5"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-text-dim">ডিজেল (Diesel)</Label>
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        value={prices.diesel} 
                        onChange={(e) => setPrices({...prices, diesel: Number(e.target.value)})}
                        className="bg-white/5"
                      />
                    </div>
                  </div>
                  <Button onClick={handlePriceUpdate} className="w-full mt-2" variant="outline">
                    মূল্য আপডেট করুন
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">পাম্প তথ্য</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-text-dim">পাম্পের নাম</span>
                  <span className="text-white font-medium">{operator.pump_name}</span>
                </div>
                <div className="flex justify-between text-sm py-2 border-b border-white/5">
                  <span className="text-text-dim">অবস্থান</span>
                  <span className="text-white font-medium">{operator.location}</span>
                </div>
                <div className="flex justify-between text-sm py-2">
                  <span className="text-text-dim">স্ট্যাটাস</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] ${operator.is_open ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
                    {operator.is_open ? 'Open' : 'Closed'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
