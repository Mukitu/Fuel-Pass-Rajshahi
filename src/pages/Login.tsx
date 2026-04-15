import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Droplet, LogIn } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Label } from '@/src/components/ui/Label';
import { db } from '@/src/lib/db';

export default function Login() {
  const [activeTab, setActiveTab] = useState<'citizen' | 'admin' | 'operator'>('citizen');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    
    try {
      let user;

      if (activeTab === 'citizen') {
        user = await db.profiles.get(mobile);
        if (!user || user.role !== 'owner') {
          setError('দুঃখিত, এই মোবাইল নম্বরটি নিবন্ধিত নয়। (Mobile number not registered)');
          setIsLoggingIn(false);
          return;
        }
        if (user.engine_no !== password) {
          setError('ইঞ্জিন নম্বর ভুল হয়েছে। (Incorrect Engine Number)');
          setIsLoggingIn(false);
          return;
        }
      } else if (activeTab === 'admin') {
        user = await db.profiles.getByEmail(email);
        if (!user || user.role !== 'admin') {
          setError('দুঃখিত, এই ইমেইলটি নিবন্ধিত নয়। (Email not registered)');
          setIsLoggingIn(false);
          return;
        }
        if (user.password !== password) {
          setError('পাসওয়ার্ড ভুল হয়েছে। (Incorrect Password)');
          setIsLoggingIn(false);
          return;
        }
      } else if (activeTab === 'operator') {
        user = await db.profiles.get(mobile);
        if (!user || user.role !== 'operator') {
          setError('দুঃখিত, এই মোবাইল নম্বরটি নিবন্ধিত নয়। (Mobile number not registered)');
          setIsLoggingIn(false);
          return;
        }
        if (user.password !== password) {
          setError('পাসওয়ার্ড ভুল হয়েছে। (Incorrect Password)');
          setIsLoggingIn(false);
          return;
        }
      }

      if (!user) {
        setIsLoggingIn(false);
        return;
      }

      localStorage.setItem('user', JSON.stringify(user));
      
      if (user.role === 'admin') navigate('/dashboard/admin');
      else if (user.role === 'operator') navigate('/dashboard/operator');
      else navigate('/dashboard/owner');
    } catch (err: any) {
      console.error('Login error:', err);
      const errorMessage = err.message || 'লগইন করার সময় একটি সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।';
      setError(errorMessage);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <Button 
          variant="ghost" 
          className="mb-4 pl-0 text-text-dim hover:text-white" 
          onClick={() => navigate('/')}
        >
          <span className="mr-2">←</span> ফিরে যান (Back)
        </Button>

        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent-cyan/10 border border-accent-cyan/30 mb-4"
          >
            <Droplet className="w-10 h-10 text-accent-cyan" />
          </motion.div>
          <h1 className="text-4xl font-bold text-accent-cyan mb-2">Fuel Pass</h1>
          <p className="text-xl text-text-dim font-medium">রাজশাহী (Rajshahi)</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">লগইন করুন (Login)</CardTitle>
            <CardDescription className="text-center">আপনার অ্যাকাউন্টের ধরন নির্বাচন করুন</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-6 bg-white/5 p-1 rounded-xl">
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'citizen' ? 'bg-accent-cyan text-primary-blue' : 'text-text-dim hover:text-white'}`}
                onClick={() => { setActiveTab('citizen'); setError(''); }}
              >
                নাগরিক
              </button>
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'operator' ? 'bg-accent-cyan text-primary-blue' : 'text-text-dim hover:text-white'}`}
                onClick={() => { setActiveTab('operator'); setError(''); }}
              >
                পাম্প
              </button>
              <button 
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === 'admin' ? 'bg-accent-cyan text-primary-blue' : 'text-text-dim hover:text-white'}`}
                onClick={() => { setActiveTab('admin'); setError(''); }}
              >
                অ্যাডমিন
              </button>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {activeTab === 'citizen' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">মোবাইল নম্বর (Mobile Number)</Label>
                    <Input 
                      id="mobile" 
                      placeholder="01XXXXXXXXX" 
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">ইঞ্জিন নম্বর (Engine No / Password)</Label>
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="আপনার ইঞ্জিন নম্বর দিন" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {activeTab === 'admin' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email">জিমেইল (Gmail)</Label>
                    <Input 
                      id="email" 
                      type="email"
                      placeholder="admin@gmail.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">পাসওয়ার্ড (Password)</Label>
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="********" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              {activeTab === 'operator' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="mobile">মোবাইল নম্বর (Mobile Number)</Label>
                    <Input 
                      id="mobile" 
                      placeholder="01XXXXXXXXX" 
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">পাসওয়ার্ড (Password)</Label>
                    <Input 
                      id="password" 
                      type="password"
                      placeholder="********" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
              
              {error && (
                <motion.p 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="text-danger text-sm text-center"
                >
                  {error}
                </motion.p>
              )}

              <Button type="submit" className="w-full" size="lg" disabled={isLoggingIn}>
                <LogIn className="w-5 h-5 mr-2" />
                {isLoggingIn ? 'প্রবেশ করা হচ্ছে...' : 'প্রবেশ করুন'}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-dim">
                অ্যাকাউন্ট নেই?{' '}
                <button 
                  onClick={() => navigate('/register')}
                  className="text-accent-cyan hover:text-accent-cyan/80 font-medium underline underline-offset-4"
                >
                  নিবন্ধন করুন (Register)
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
