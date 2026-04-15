import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UserPlus, ArrowLeft, ShieldCheck, Droplet, CheckCircle2 } from 'lucide-react';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Label } from '@/src/components/ui/Label';
import { db, Profile, VEHICLE_ZONES, VEHICLE_SERIES } from '@/src/lib/db';

export default function Register() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'citizen' | 'operator'>('citizen');
  const [step, setStep] = useState(1);
  const [smartCardImage, setSmartCardImage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    mobile: '',
    vehicle_zone: VEHICLE_ZONES[0],
    vehicle_series: VEHICLE_SERIES[0],
    vehicle_number: '',
    chassis_no: '',
    engine_no: '',
    fuel_type: 'Octane',
    vehicle_type: 'মোটরসাইকেল',
    color: '',
    profession: '',
    cc: '',
    address: '',
    email: '',
    password: '',
    pump_name: '',
    location: '',
    trade_license: '',
    fuel_types_sold: 'Octane, Petrol, Diesel'
  });
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSmartCardImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVehicleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Remove all non-digit characters
    const rawValue = e.target.value.replace(/\D/g, '');
    // Limit to 6 digits maximum
    const truncatedValue = rawValue.slice(0, 6);
    
    // Format as XX-XXXX
    let formattedValue = truncatedValue;
    if (truncatedValue.length > 2) {
      formattedValue = `${truncatedValue.slice(0, 2)}-${truncatedValue.slice(2)}`;
    }
    
    setFormData({...formData, vehicle_number: formattedValue});
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsRegistering(true);

    try {
      if (activeTab === 'citizen') {
        const fullVehicleNo = `${formData.vehicle_zone}-${formData.vehicle_series}-${formData.vehicle_number}`;

        if (!formData.engine_no || !formData.chassis_no || !smartCardImage) {
          setError('দয়া করে ইঞ্জিন নম্বর, চ্যাসিস নম্বর এবং স্মার্ট কার্ডের ছবি প্রদান করুন।');
          setIsRegistering(false);
          return;
        }

        const existingMobile = await db.profiles.get(formData.mobile);
        if (existingMobile) {
          setError('এই মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত। (Mobile already registered)');
          setIsRegistering(false);
          return;
        }
        
        const existingVehicle = await db.profiles.getByVehicle(fullVehicleNo);
        if (existingVehicle) {
          setError('এই গাড়ির নম্বরটি ইতিমধ্যে নিবন্ধিত। (Vehicle already registered)');
          setIsRegistering(false);
          return;
        }

        const existingEngine = await db.profiles.getByEngine(formData.engine_no);
        if (existingEngine) {
          setError('এই ইঞ্জিন নম্বরটি ইতিমধ্যে নিবন্ধিত। (Engine number already registered)');
          setIsRegistering(false);
          return;
        }

        const existingChassis = await db.profiles.getByChassis(formData.chassis_no);
        if (existingChassis) {
          setError('এই চ্যাসিস নম্বরটি ইতিমধ্যে নিবন্ধিত। (Chassis number already registered)');
          setIsRegistering(false);
          return;
        }

        const newProfile: Profile = {
          id: `owner-${Date.now()}`,
          full_name: formData.full_name,
          mobile: formData.mobile,
          vehicle_no: fullVehicleNo,
          engine_no: formData.engine_no,
          chassis_no: formData.chassis_no,
          fuel_type: formData.fuel_type,
          vehicle_type: formData.vehicle_type,
          color: formData.color,
          profession: formData.profession,
          cc: formData.cc,
          address: formData.address,
          smart_card_url: smartCardImage,
          role: 'owner',
          status: 'pending'
        };

        await db.profiles.create(newProfile);
        alert('আপনার নিবন্ধন সফল হয়েছে! অ্যাডমিন অনুমোদনের পর আপনি লগইন করতে পারবেন।');
        navigate('/login');
      } else if (activeTab === 'operator') {
        const existingMobile = await db.profiles.get(formData.mobile);
        if (existingMobile) {
          setError('এই মোবাইল নম্বরটি ইতিমধ্যে নিবন্ধিত। (Mobile already registered)');
          setIsRegistering(false);
          return;
        }
        const newProfile: Profile = {
          id: `op-${Date.now()}`,
          full_name: formData.full_name,
          mobile: formData.mobile,
          pump_name: formData.pump_name,
          location: formData.location,
          trade_license: formData.trade_license,
          fuel_types_sold: formData.fuel_types_sold.split(',').map(s => s.trim()),
          password: formData.password,
          role: 'operator',
          status: 'pending'
        };
        await db.profiles.create(newProfile);
        alert('আপনার পাম্প নিবন্ধন সফল হয়েছে! ডিসি স্যারের অনুমোদনের পর আপনি লগইন করতে পারবেন।');
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      const errorMessage = err.message || 'নিবন্ধন করার সময় একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।';
      setError(errorMessage);
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 lg:p-8 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-6xl z-10"
      >
        <Button 
          variant="ghost" 
          className="mb-4 pl-0 text-text-dim hover:text-white" 
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ফিরে যান (Back)
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-5 glass-panel overflow-hidden border border-glass-border">
          
          {/* Left Side - Branding & Info */}
          <div className="lg:col-span-2 bg-gradient-to-br from-primary-blue to-primary-blue/50 p-8 lg:p-12 flex flex-col justify-center relative border-r border-glass-border">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5 pointer-events-none"></div>
            
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-full bg-accent-cyan/20 border border-accent-cyan/50 flex items-center justify-center">
                <Droplet className="w-6 h-6 text-accent-cyan" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-wide">FuelPass <span className="text-danger">BD</span></h1>
              </div>
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-accent-cyan mb-4 leading-tight">
              জ্বালানি বিতরণ ব্যবস্থাপনা সিস্টেম
            </h2>
            <p className="text-text-dim text-lg mb-12">
              এনক্রিপ্টেড QR পরিচয় ও কোটা ট্র্যাকিংসহ নিরাপদ এবং স্বচ্ছ জ্বালানি বিতরণ।
            </p>

            <div className="bg-accent-cyan/5 border border-accent-cyan/20 rounded-xl p-6">
              <h3 className="text-accent-cyan font-bold mb-2 flex items-center">
                <ShieldCheck className="w-5 h-5 mr-2" />
                বিশেষ দ্রষ্টব্য:
              </h3>
              <p className="text-sm text-text-dim leading-relaxed">
                এই অ্যাপটি বর্তমানে পাইলট/টেস্টিং পর্যায়ে রয়েছে এবং এখনও সকল সাধারণ জনগণের জন্য উন্মুক্ত নয়। অ্যাপটি সবার জন্য আনুষ্ঠানিকভাবে চালু হলে এটি উন্মুক্ত করা হবে।
              </p>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="lg:col-span-3 p-8 lg:p-12 bg-black/20 backdrop-blur-md overflow-y-auto max-h-[90vh]">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">নিবন্ধন করুন</h2>
              <p className="text-text-dim">আপনার অ্যাকাউন্টের ধরন নির্বাচন করুন</p>
            </div>

            <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl">
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'citizen' ? 'bg-accent-cyan text-primary-blue' : 'text-text-dim hover:text-white'}`}
                onClick={() => { setActiveTab('citizen'); setStep(1); setError(''); }}
              >
                নাগরিক
              </button>
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'operator' ? 'bg-accent-cyan text-primary-blue' : 'text-text-dim hover:text-white'}`}
                onClick={() => { setActiveTab('operator'); setError(''); }}
              >
                পাম্প অপারেটর
              </button>
            </div>

            <form onSubmit={handleRegister} className="space-y-6 max-w-md mx-auto">
              {activeTab === 'citizen' && step === 1 && (
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">পুরো নাম (Full Name)</Label>
                    <Input 
                      id="full_name" 
                      placeholder="e.g. Rahim Uddin" 
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="mobile">মোবাইল নম্বর (Mobile Number)</Label>
                    <Input 
                      id="mobile" 
                      placeholder="01XXXXXXXXX" 
                      value={formData.mobile}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profession">পেশা (Profession)</Label>
                    <Input 
                      id="profession" 
                      placeholder="e.g. ছাত্র / ব্যবসায়ী" 
                      value={formData.profession}
                      onChange={(e) => setFormData({...formData, profession: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">ঠিকানা (Address)</Label>
                    <Input 
                      id="address" 
                      placeholder="e.g. বোয়ালিয়া, রাজশাহী" 
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      required
                    />
                  </div>

                  <Button 
                    type="button" 
                    className="w-full mt-4" 
                    size="lg"
                    onClick={() => {
                      if (!formData.full_name || !formData.mobile || !formData.profession || !formData.address) {
                        setError('অনুগ্রহ করে সকল তথ্য প্রদান করুন।');
                        return;
                      }
                      setError('');
                      setStep(2);
                    }}
                  >
                    পরবর্তী ধাপ (Next)
                  </Button>
                </motion.div>
              )}

              {activeTab === 'citizen' && step === 2 && (
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                  <div className="space-y-2">
                    <Label>গাড়ির রেজিস্ট্রেশন নম্বর (Vehicle Reg No.)</Label>
                    <div className="flex gap-2">
                      <select 
                        className="flex h-12 w-[40%] rounded-xl glass-input px-3 py-2 text-sm outline-none appearance-none cursor-pointer"
                        value={formData.vehicle_zone}
                        onChange={(e) => setFormData({...formData, vehicle_zone: e.target.value})}
                      >
                        {VEHICLE_ZONES.map(zone => (
                          <option key={zone} value={zone} className="bg-primary-blue">{zone}</option>
                        ))}
                      </select>
                      
                      <select 
                        className="flex h-12 w-[25%] rounded-xl glass-input px-3 py-2 text-sm outline-none appearance-none cursor-pointer"
                        value={formData.vehicle_series}
                        onChange={(e) => setFormData({...formData, vehicle_series: e.target.value})}
                      >
                        {VEHICLE_SERIES.map(series => (
                          <option key={series} value={series} className="bg-primary-blue">{series}</option>
                        ))}
                      </select>

                      <Input 
                        placeholder="11-2233" 
                        className="w-[35%]"
                        value={formData.vehicle_number}
                        onChange={handleVehicleNumberChange}
                        maxLength={7}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_type">যানের বিবরণ</Label>
                      <select 
                        id="vehicle_type"
                        className="flex h-10 w-full rounded-xl glass-input px-3 py-2 text-sm outline-none appearance-none"
                        value={formData.vehicle_type}
                        onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                        required
                      >
                        <option value="মোটরসাইকেল" className="bg-primary-blue">মোটরসাইকেল</option>
                        <option value="প্রাইভেট কার" className="bg-primary-blue">প্রাইভেট কার</option>
                        <option value="ট্রাক" className="bg-primary-blue">ট্রাক</option>
                        <option value="বাস" className="bg-primary-blue">বাস</option>
                        <option value="কোম্পানির ট্রাক" className="bg-primary-blue">কোম্পানির ট্রাক</option>
                        <option value="প্রাইভেট অ্যাম্বুলেন্স" className="bg-primary-blue">প্রাইভেট অ্যাম্বুলেন্স</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="color">রং (Color)</Label>
                      <Input 
                        id="color" 
                        placeholder="e.g. লাল" 
                        value={formData.color}
                        onChange={(e) => setFormData({...formData, color: e.target.value})}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cc">সিসি (CC)</Label>
                      <Input 
                        id="cc" 
                        placeholder="e.g. 150" 
                        value={formData.cc}
                        onChange={(e) => setFormData({...formData, cc: e.target.value})}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="fuel_type">জ্বালানির ধরন</Label>
                      <select 
                        id="fuel_type"
                        className="flex h-12 w-full rounded-xl glass-input px-4 py-2 text-sm outline-none appearance-none cursor-pointer"
                        value={formData.fuel_type}
                        onChange={(e) => setFormData({...formData, fuel_type: e.target.value})}
                      >
                        <option value="Octane" className="bg-primary-blue">Octane</option>
                        <option value="Petrol" className="bg-primary-blue">Petrol</option>
                        <option value="Diesel" className="bg-primary-blue">Diesel</option>
                        <option value="CNG" className="bg-primary-blue">CNG</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="chassis_no">চ্যাসিস নম্বর (Chassis Number)</Label>
                    <Input 
                      id="chassis_no" 
                      placeholder="e.g. MHKA12345678" 
                      value={formData.chassis_no}
                      onChange={(e) => setFormData({...formData, chassis_no: e.target.value})}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>স্মার্ট কার্ডের ছবি আপলোড করুন (Upload Smart Card Image)</Label>
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      required
                      className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent-cyan file:text-primary-blue hover:file:bg-accent-cyan/80"
                    />
                    {smartCardImage && (
                      <div className="mt-2 text-sm text-success flex items-center">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> ছবি আপলোড হয়েছে
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="engine_no">ইঞ্জিন নম্বর (Engine Number - এটি আপনার পাসওয়ার্ড)</Label>
                    <Input 
                      id="engine_no" 
                      placeholder="e.g. G123456" 
                      value={formData.engine_no}
                      onChange={(e) => setFormData({...formData, engine_no: e.target.value})}
                      required
                    />
                  </div>
                  
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-danger text-sm text-center bg-danger/10 p-3 rounded-lg border border-danger/20">
                      {error}
                    </motion.p>
                  )}

                  <div className="flex gap-4 mt-4">
                    <Button type="button" variant="outline" className="w-1/3" onClick={() => setStep(1)}>
                      পেছনে (Back)
                    </Button>
                    <Button type="submit" className="w-2/3" size="lg" disabled={isRegistering}>
                      <UserPlus className="w-5 h-5 mr-2" />
                      {isRegistering ? 'নিবন্ধন করা হচ্ছে...' : 'নিবন্ধন সম্পন্ন করুন'}
                    </Button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'operator' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="op_name">অপারেটরের নাম (Operator Name)</Label>
                    <Input 
                      id="op_name" 
                      placeholder="e.g. Operator Name" 
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pump_name">পাম্পের নাম (Pump Name)</Label>
                    <Input 
                      id="pump_name" 
                      placeholder="e.g. Rajshahi Filling Station" 
                      value={formData.pump_name}
                      onChange={(e) => setFormData({...formData, pump_name: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="op_mobile">মোবাইল নম্বর</Label>
                    <Input 
                      id="op_mobile" 
                      placeholder="01XXXXXXXXX" 
                      value={formData.mobile}
                      onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">লোকেশন (Location)</Label>
                    <Input 
                      id="location" 
                      placeholder="e.g. সাহেব বাজার, রাজশাহী" 
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trade_license">ট্রেড লাইসেন্স নম্বর (Trade License)</Label>
                    <Input 
                      id="trade_license" 
                      placeholder="e.g. TRD-123456" 
                      value={formData.trade_license}
                      onChange={(e) => setFormData({...formData, trade_license: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fuel_types_sold">কী কী তেল বিক্রি করেন (কমা দিয়ে লিখুন)</Label>
                    <Input 
                      id="fuel_types_sold" 
                      placeholder="e.g. Octane, Petrol, Diesel" 
                      value={formData.fuel_types_sold}
                      onChange={(e) => setFormData({...formData, fuel_types_sold: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="op_password">পাসওয়ার্ড (Password)</Label>
                    <Input 
                      id="op_password" 
                      type="password"
                      placeholder="********" 
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      required
                    />
                  </div>
                  {error && (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-danger text-sm text-center bg-danger/10 p-3 rounded-lg border border-danger/20">
                      {error}
                    </motion.p>
                  )}
                  <Button type="submit" className="w-full mt-4" size="lg" disabled={isRegistering}>
                    <UserPlus className="w-5 h-5 mr-2" />
                    {isRegistering ? 'নিবন্ধন করা হচ্ছে...' : 'পাম্প নিবন্ধন করুন'}
                  </Button>
                </motion.div>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-text-dim">
                  ইতিমধ্যে অ্যাকাউন্ট আছে?{' '}
                  <button 
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-accent-cyan hover:text-accent-cyan/80 font-medium underline underline-offset-4"
                  >
                    লগইন করুন
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
