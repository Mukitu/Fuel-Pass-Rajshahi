import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, ScanLine, Search, CheckCircle2, XCircle, AlertTriangle, QrCode, Clock } from 'lucide-react';
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

  return (
    <div className="min-h-screen p-3 md:p-8 relative overflow-hidden">
      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">SMARTRefill</h1>
            <p className="text-text-dim text-sm">অপারেটর: {operator.full_name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => { localStorage.removeItem('user'); navigate('/'); }} className="w-full md:w-auto">
            <LogOut className="w-4 h-4 mr-2" />
            লগআউট
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center text-lg md:text-xl">
                <Droplet className="w-5 h-5 mr-2 text-accent-cyan" />
                জ্বালানি মূল্য নির্ধারণ (Fuel Price Setup)
              </CardTitle>
              <CardDescription>প্রতি লিটার জ্বালানির দাম নির্ধারণ করুন</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>পেট্রোল (Petrol) / L</Label>
                  <Input 
                    type="number" 
                    value={prices.petrol} 
                    onChange={(e) => setPrices({...prices, petrol: Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>অকটেন (Octane) / L</Label>
                  <Input 
                    type="number" 
                    value={prices.octane} 
                    onChange={(e) => setPrices({...prices, octane: Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>ডিজেল (Diesel) / L</Label>
                  <Input 
                    type="number" 
                    value={prices.diesel} 
                    onChange={(e) => setPrices({...prices, diesel: Number(e.target.value)})}
                    placeholder="0"
                  />
                </div>
              </div>
              <Button onClick={handlePriceUpdate} className="w-full">
                মূল্য সংরক্ষণ করুন (Save Prices)
              </Button>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center text-lg md:text-xl">
                <ScanLine className="w-5 h-5 mr-2 text-accent-cyan" />
                গাড়ি অনুসন্ধান (Vehicle Search)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 mb-4">
                <Input 
                  placeholder="গাড়ির নম্বর লিখুন" 
                  value={searchVehicle}
                  onChange={(e) => setSearchVehicle(e.target.value)}
                  className="flex-1 uppercase h-12"
                />
                <div className="flex gap-2">
                  <Button type="submit" disabled={isSearching} className="flex-1 sm:flex-none h-12">
                    <Search className="w-4 h-4 mr-2" />
                    খুঁজুন
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowScanner(!showScanner)} className="h-12 w-12 p-0">
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
                    className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm flex items-center"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
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
                    className="mt-4 overflow-hidden rounded-xl border border-glass-border"
                  >
                    <Scanner 
                      onScan={(result) => {
                        if (result && result.length > 0) {
                          handleScan(result[0].rawValue);
                        }
                      }}
                      components={{ finder: false }}
                    />
                    <div className="p-2 bg-black/50 text-center text-xs text-text-dim">
                      QR কোডটি ক্যামেরার সামনে ধরুন
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {isSearching ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="md:col-span-2"
              >
                <Shimmer className="h-48 w-full" />
              </motion.div>
            ) : scannedVehicle && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className="md:col-span-2 space-y-6"
              >
                <Card className={
                  validationStatus === 'valid' ? 'border-success/50 shadow-[0_0_15px_rgba(0,230,118,0.2)]' :
                  validationStatus === 'blocked' ? 'border-danger/50 shadow-[0_0_15px_rgba(255,77,77,0.2)]' :
                  'border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.2)]'
                }>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {validationStatus === 'valid' && <CheckCircle2 className="w-8 h-8 text-success shrink-0" />}
                      {validationStatus === 'blocked' && <XCircle className="w-8 h-8 text-danger shrink-0" />}
                      {validationStatus === 'gap_error' && <AlertTriangle className="w-8 h-8 text-yellow-400 shrink-0" />}
                      
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-white mb-1">{scannedVehicle.vehicle_no}</h3>
                        <p className="text-text-dim text-sm mb-4">মালিক: {scannedVehicle.full_name} • জ্বালানি: {scannedVehicle.fuel_type}</p>
                        
                        <div className={`p-3 rounded-lg text-sm font-medium ${
                          validationStatus === 'valid' ? 'bg-success/20 text-success' :
                          validationStatus === 'blocked' ? 'bg-danger/20 text-danger' :
                          'bg-yellow-500/20 text-yellow-200'
                        }`}>
                          {validationMessage}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {validationStatus === 'valid' && !txSuccess && (
                  <Card>
                    <CardHeader>
                      <CardTitle>জ্বালানি প্রদান (Refill)</CardTitle>
                      <CardDescription>সর্বোচ্চ সীমা: ৳ {settings.quotas[scannedVehicle.vehicle_type || '']?.bdt_limit || 0}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleTransaction} className="space-y-4">
                        <div className="space-y-2">
                          <Label>জ্বালানির ধরন (Fuel Type)</Label>
                          <div className="flex gap-2">
                            {['Petrol', 'Octane', 'Diesel'].map((type) => (
                              <button
                                key={type}
                                type="button"
                                onClick={() => {
                                  setSelectedFuelType(type);
                                  // Recalculate based on current amount if exists
                                  if (amount) {
                                    const price = type.toLowerCase() === 'petrol' ? prices.petrol : 
                                                  type.toLowerCase() === 'octane' ? prices.octane : prices.diesel;
                                    if (price > 0) setLiters((Number(amount) / price).toFixed(2));
                                  }
                                }}
                                className={`flex-1 py-2 px-3 rounded-lg border transition-all ${
                                  selectedFuelType === type 
                                    ? 'bg-accent-cyan/20 border-accent-cyan text-accent-cyan shadow-[0_0_10px_rgba(100,255,218,0.2)]' 
                                    : 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                                }`}
                              >
                                {type === 'Petrol' ? 'পেট্রোল' : type === 'Octane' ? 'অকটেন' : 'ডিজেল'}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>টাকার পরিমাণ (Amount in BDT)</Label>
                            <Input 
                              type="number" 
                              placeholder="0" 
                              value={amount}
                              onChange={(e) => calculateFromAmount(e.target.value)}
                              max={settings.quotas[scannedVehicle.vehicle_type || '']?.bdt_limit || 0}
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>লিটার (Quantity in Liters)</Label>
                            <Input 
                              type="number" 
                              step="0.01"
                              placeholder="0.00" 
                              value={liters}
                              onChange={(e) => calculateFromLiters(e.target.value)}
                              required
                            />
                          </div>
                        </div>
                        
                        <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                          <div className="flex justify-between text-sm">
                            <span className="text-text-dim">বর্তমান মূল্য:</span>
                            <span className="text-white font-medium">৳ {getPriceForType(selectedFuelType)} / L</span>
                          </div>
                        </div>

                        <Button type="submit" className="w-full" size="lg">
                          নিশ্চিত করুন (Confirm Transaction)
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                )}

                {txSuccess && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
                    <Card className="bg-success/20 border-success/50">
                      <CardContent className="p-8 text-center">
                        <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
                        <h3 className="text-2xl font-bold text-white mb-2">লেনদেন সফল হয়েছে!</h3>
                        <p className="text-success">৳ {amount} এর জ্বালানি প্রদান করা হয়েছে।</p>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="md:col-span-2 mt-6">
            <CardHeader>
              <CardTitle>আজকের লেনদেন (Today's Transactions)</CardTitle>
              <CardDescription>মোট লেনদেন: {todaysTransactions.length} টি</CardDescription>
            </CardHeader>
            <CardContent>
              {todaysTransactions.length === 0 ? (
                <p className="text-text-dim text-center py-4">আজ কোনো লেনদেন হয়নি।</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-text-dim uppercase bg-white/5">
                      <tr>
                        <th className="px-4 py-3 rounded-tl-lg">সময়</th>
                        <th className="px-4 py-3">গাড়ির নম্বর</th>
                        <th className="px-4 py-3">জ্বালানি</th>
                        <th className="px-4 py-3">পরিমাণ (BDT)</th>
                        <th className="px-4 py-3 rounded-tr-lg text-right">লিটার (L)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {todaysTransactions.map((tx) => {
                        return (
                          <tr key={tx.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3">{new Date(tx.created_at).toLocaleTimeString('bn-BD')}</td>
                            <td className="px-4 py-3 font-medium text-white">{tx.vehicle_no}</td>
                            <td className="px-4 py-3 text-accent-cyan">{tx.fuel_type || 'N/A'}</td>
                            <td className="px-4 py-3 font-bold text-success">৳ {tx.amount_bdt}</td>
                            <td className="px-4 py-3 text-right text-white">{tx.liters || 'N/A'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
