// Mock Database to simulate Supabase for the UI demonstration

export type Role = 'admin' | 'operator' | 'owner';

export interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  role: Role;
  status?: 'pending' | 'approved' | 'rejected'; // Added status
  
  // Owner specific
  vehicle_no?: string;
  fuel_type?: string;
  engine_no?: string;
  chassis_no?: string;
  vehicle_type?: string;
  color?: string;
  profession?: string;
  cc?: string;
  address?: string;
  smart_card_url?: string; // Added smart card image URL

  // Admin specific
  email?: string;
  password?: string;

  // Operator specific
  pump_name?: string;
  location?: string;
  trade_license?: string;
  fuel_types_sold?: string[];
  is_open?: boolean; // Added to track if pump is open
}

export interface QuotaSettings {
  bdt_limit: number;
  day_gap: number;
}

export interface GlobalSettings {
  quotas: Record<string, QuotaSettings>;
  marquee_text: string;
  auto_penalty_days?: number;
}

export interface BlacklistEntry {
  vehicle_no: string;
  blocked_until: string; // ISO date
  reason: string;
}

export interface Transaction {
  id: string;
  vehicle_no: string;
  amount_bdt: number;
  pump_id: string;
  created_at: string; // ISO date
}

// Initial Mock Data
let profiles: Profile[] = [
  { id: 'admin-1', full_name: 'DC Admin', mobile: '01303595062', email: 'mukituislamnishat@gmail.com', password: '2244172129@Nishat', role: 'admin', status: 'approved' },
  { id: 'op-1', full_name: 'Pump Operator 1', mobile: '01800000000', pump_name: 'Rajshahi Filling Station', location: 'সাহেব বাজার, রাজশাহী', password: 'pump', role: 'operator', status: 'approved', is_open: true },
  { 
    id: 'owner-1', 
    full_name: 'Rahim Uddin', 
    mobile: '01900000000', 
    vehicle_no: 'RAJ-H-11-2233', 
    fuel_type: 'Octane', 
    engine_no: 'ENG123456',
    chassis_no: 'CHS123456',
    vehicle_type: 'মোটরসাইকেল',
    color: 'লাল',
    profession: 'ছাত্র',
    cc: '150',
    address: 'বোয়ালিয়া, রাজশাহী',
    role: 'owner',
    status: 'approved'
  },
];

let globalSettings: GlobalSettings = {
  quotas: {
    'মোটরসাইকেল': { bdt_limit: 500, day_gap: 3 },
    'প্রাইভেট কার': { bdt_limit: 3000, day_gap: 7 },
    'ট্রাক': { bdt_limit: 10000, day_gap: 5 },
    'বাস': { bdt_limit: 15000, day_gap: 5 },
    'কোম্পানির ট্রাক': { bdt_limit: 12000, day_gap: 5 },
    'প্রাইভেট অ্যাম্বুলেন্স': { bdt_limit: 5000, day_gap: 2 },
  },
  marquee_text: "রাজশাহী জেলা প্রশাসনের ডিজিটাল ফুয়েল ম্যানেজমেন্ট সিস্টেমে আপনাকে স্বাগতম। প্রতিটি পাম্পে QR কোড স্ক্যান করে তেল নিন। নির্ধারিত কোটার বেশি তেল নেওয়া যাবে না। সকল গাড়ি রেজিস্ট্রেশন বাধ্যতামূলক।",
  auto_penalty_days: 7,
};

export const VEHICLE_ZONES = [
  'ঢাকা মেট্রো', 'রাজশাহী মেট্রো', 'চট্টগ্রাম মেট্রো', 'খুলনা মেট্রো', 
  'বরিশাল মেট্রো', 'সিলেট মেট্রো', 'রংপুর মেট্রো', 'ময়মনসিংহ মেট্রো', 
  'ঢাকা', 'রাজশাহী', 'চট্টগ্রাম', 'খুলনা', 'বরিশাল', 'সিলেট', 'রংপুর', 'ময়মনসিংহ',
  'গাজীপুর', 'নারায়ণগঞ্জ', 'কুমিল্লা', 'বগুড়া', 'ফরিদপুর', 'পাবনা', 'দিনাজপুর'
];

export const VEHICLE_SERIES = [
  'ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ত', 'থ', 'দ', 'ধ', 'ন', 
  'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'স', 'হ', 'অ', 'আ', 'ই', 'উ', 'এ'
];

let blacklist: BlacklistEntry[] = [
  { vehicle_no: 'RAJ-H-99-8877', blocked_until: new Date(Date.now() + 86400000 * 3).toISOString(), reason: 'Rule Violation' }
];

let transactions: Transaction[] = [
  { id: 'tx-1', vehicle_no: 'RAJ-H-11-2233', amount_bdt: 1500, pump_id: 'op-1', created_at: new Date(Date.now() - 86400000 * 6).toISOString() } // 6 days ago
];

export const db = {
  profiles: {
    getAll: () => [...profiles],
    get: (mobile: string) => profiles.find(p => p.mobile === mobile),
    getByEmail: (email: string) => profiles.find(p => p.email === email),
    getByVehicle: (vehicle_no: string) => profiles.find(p => p.vehicle_no === vehicle_no),
    getByEngine: (engine_no: string) => profiles.find(p => p.engine_no === engine_no),
    getByChassis: (chassis_no: string) => profiles.find(p => p.chassis_no === chassis_no),
    create: (profile: Profile) => { 
      if (profile.role === 'operator') profile.is_open = true;
      profiles.push(profile); 
      return profile; 
    },
    updateStatus: (id: string, status: 'approved' | 'rejected') => {
      const index = profiles.findIndex(p => p.id === id);
      if (index !== -1) {
        profiles[index].status = status;
      }
    },
    update: (id: string, updates: Partial<Profile>) => {
      const index = profiles.findIndex(p => p.id === id);
      if (index !== -1) {
        profiles[index] = { ...profiles[index], ...updates };
      }
    },
    delete: (id: string) => {
      profiles = profiles.filter(p => p.id !== id);
    },
    togglePumpStatus: (id: string, isOpen: boolean) => {
      const index = profiles.findIndex(p => p.id === id);
      if (index !== -1) {
        profiles[index].is_open = isOpen;
      }
    }
  },
  settings: {
    get: () => ({ ...globalSettings }),
    update: (settings: Partial<GlobalSettings>) => { globalSettings = { ...globalSettings, ...settings }; return globalSettings; }
  },
  blacklist: {
    getAll: () => [...blacklist],
    get: (vehicle_no: string) => blacklist.find(b => b.vehicle_no === vehicle_no),
    add: (entry: BlacklistEntry) => { 
      blacklist = blacklist.filter(b => b.vehicle_no !== entry.vehicle_no);
      blacklist.push(entry); 
    },
    remove: (vehicle_no: string) => { blacklist = blacklist.filter(b => b.vehicle_no !== vehicle_no); }
  },
  transactions: {
    getAll: () => [...transactions],
    getByVehicle: (vehicle_no: string) => transactions.filter(t => t.vehicle_no === vehicle_no).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
    add: (tx: Omit<Transaction, 'id' | 'created_at'>) => {
      const newTx = { ...tx, id: `tx-${Date.now()}`, created_at: new Date().toISOString() };
      transactions.push(newTx);
      return newTx;
    },
    delete: (id: string) => {
      transactions = transactions.filter(t => t.id !== id);
    }
  }
};
