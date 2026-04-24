import { supabase } from './supabase';

export type Role = 'admin' | 'operator' | 'owner';

export interface Profile {
  id: string;
  full_name: string;
  mobile: string;
  role: Role;
  status?: 'pending' | 'approved' | 'rejected';
  
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
  smart_card_url?: string;

  // Admin specific
  email?: string;
  password?: string;

  // Operator specific
  pump_name?: string;
  location?: string;
  trade_license?: string;
  fuel_types_sold?: string[];
  is_open?: boolean;
  petrol_price?: number;
  octane_price?: number;
  diesel_price?: number;
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
  liters?: number;
  fuel_type?: string;
  pump_id: string;
  pump_name?: string;
  created_at: string; // ISO date
}

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

export const db = {
  profiles: {
    getAll: async () => {
      const { data, error } = await supabase.from('profiles').select('*');
      if (error) throw error;
      return data as Profile[];
    },
    get: async (mobile: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('mobile', mobile).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Profile | null;
    },
    getByEmail: async (email: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('email', email).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Profile | null;
    },
    getByVehicle: async (vehicle_no: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('vehicle_no', vehicle_no).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Profile | null;
    },
    getByEngine: async (engine_no: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('engine_no', engine_no).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Profile | null;
    },
    getByChassis: async (chassis_no: string) => {
      const { data, error } = await supabase.from('profiles').select('*').eq('chassis_no', chassis_no).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as Profile | null;
    },
    create: async (profile: Profile) => { 
      if (profile.role === 'operator') profile.is_open = true;
      const { data, error } = await supabase.from('profiles').insert(profile).select().single();
      if (error) throw error;
      return data as Profile; 
    },
    updateStatus: async (id: string, status: 'approved' | 'rejected') => {
      const { error } = await supabase.from('profiles').update({ status }).eq('id', id);
      if (error) throw error;
    },
    update: async (id: string, updates: Partial<Profile>) => {
      const { error } = await supabase.from('profiles').update(updates).eq('id', id);
      if (error) throw error;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
    },
    togglePumpStatus: async (id: string, isOpen: boolean) => {
      const { error } = await supabase.from('profiles').update({ is_open: isOpen }).eq('id', id);
      if (error) throw error;
    }
  },
  settings: {
    get: async () => {
      const { data, error } = await supabase.from('global_settings').select('*').eq('id', 'main').single();
      if (error) throw error;
      return data as GlobalSettings;
    },
    update: async (settings: Partial<GlobalSettings>) => { 
      const { data, error } = await supabase.from('global_settings').update(settings).eq('id', 'main').select().single();
      if (error) throw error;
      return data as GlobalSettings; 
    }
  },
  blacklist: {
    getAll: async () => {
      const { data, error } = await supabase.from('blacklist').select('*');
      if (error) throw error;
      return data as BlacklistEntry[];
    },
    get: async (vehicle_no: string) => {
      const { data, error } = await supabase.from('blacklist').select('*').eq('vehicle_no', vehicle_no).single();
      if (error && error.code !== 'PGRST116') throw error;
      return data as BlacklistEntry | null;
    },
    add: async (entry: BlacklistEntry) => { 
      const { error } = await supabase.from('blacklist').upsert(entry);
      if (error) throw error;
    },
    remove: async (vehicle_no: string) => { 
      const { error } = await supabase.from('blacklist').delete().eq('vehicle_no', vehicle_no);
      if (error) throw error;
    }
  },
  transactions: {
    getAll: async () => {
      const { data, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    getByVehicle: async (vehicle_no: string) => {
      const { data, error } = await supabase.from('transactions').select('*').eq('vehicle_no', vehicle_no).order('created_at', { ascending: false });
      if (error) throw error;
      return data as Transaction[];
    },
    add: async (tx: Omit<Transaction, 'id' | 'created_at'>) => {
      const { data, error } = await supabase.from('transactions').insert(tx).select().single();
      if (error) throw error;
      return data as Transaction;
    },
    delete: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
    }
  }
};
