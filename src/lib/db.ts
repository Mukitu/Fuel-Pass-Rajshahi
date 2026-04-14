// Mock Database to simulate Supabase for the UI demonstration

export type Role = 'admin' | 'operator' | 'owner';

export interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  role: Role;
  
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

  // Admin specific
  email?: string;
  password?: string;

  // Operator specific
  pump_name?: string;
  location?: string;
  trade_license?: string;
  fuel_types_sold?: string[];
}

export interface GlobalSettings {
  bdt_limit: number;
  day_gap: number;
  marquee_text: string;
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
  { id: 'admin-1', full_name: 'DC Admin', mobile: '01700000000', email: 'admin@rajshahi.gov.bd', password: 'admin', role: 'admin' },
  { id: 'op-1', full_name: 'Pump Operator 1', mobile: '01800000000', pump_name: 'Rajshahi Filling Station', password: 'pump', role: 'operator' },
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
    role: 'owner' 
  },
];

let globalSettings: GlobalSettings = {
  bdt_limit: 2000,
  day_gap: 5,
  marquee_text: "রাজশাহী জেলা প্রশাসনের ডিজিটাল ফুয়েল ম্যানেজমেন্ট সিস্টেমে আপনাকে স্বাগতম। প্রতিটি পাম্পে QR কোড স্ক্যান করে তেল নিন। নির্ধারিত কোটার বেশি তেল নেওয়া যাবে না। সকল গাড়ি রেজিস্ট্রেশন বাধ্যতামূলক।",
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
    get: (mobile: string) => profiles.find(p => p.mobile === mobile),
    getByEmail: (email: string) => profiles.find(p => p.email === email),
    getByVehicle: (vehicle_no: string) => profiles.find(p => p.vehicle_no === vehicle_no),
    create: (profile: Profile) => { profiles.push(profile); return profile; }
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
    }
  }
};
