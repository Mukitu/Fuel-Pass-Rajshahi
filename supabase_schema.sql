-- Supabase SQL Schema for Rajshahi Fuel Pass

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS blacklist CASCADE;
DROP TABLE IF EXISTS global_settings CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Create Profiles Table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'operator')),
  full_name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- Citizen specific fields
  vehicle_no TEXT UNIQUE,
  engine_no TEXT UNIQUE,
  chassis_no TEXT UNIQUE,
  fuel_type TEXT,
  vehicle_type TEXT,
  color TEXT,
  profession TEXT,
  cc TEXT,
  address TEXT,
  smart_card_url TEXT,
  
  -- Operator specific fields
  pump_name TEXT,
  location TEXT,
  trade_license TEXT,
  fuel_types_sold TEXT[],
  is_open BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Global Settings Table
CREATE TABLE global_settings (
  id INT PRIMARY KEY DEFAULT 1,
  quotas JSONB DEFAULT '{}'::jsonb,
  marquee_text TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings row
INSERT INTO global_settings (id, quotas, marquee_text) VALUES (1, '{}', 'রাজশাহী ফুয়েল পাসে আপনাকে স্বাগতম।') ON CONFLICT DO NOTHING;

-- 3. Create Blacklist Table
CREATE TABLE blacklist (
  vehicle_no TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  blocked_until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create Transactions Table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_no TEXT NOT NULL,
  amount_bdt NUMERIC NOT NULL,
  pump_id UUID REFERENCES profiles(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile." ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Global Settings Policies
CREATE POLICY "Settings are viewable by everyone." ON global_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can update settings." ON global_settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Blacklist Policies
CREATE POLICY "Blacklist is viewable by everyone." ON blacklist FOR SELECT USING (true);
CREATE POLICY "Only admins can manage blacklist." ON blacklist FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Transactions Policies
CREATE POLICY "Transactions viewable by admins." ON transactions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Operators can view their own transactions." ON transactions FOR SELECT USING (
  auth.uid() = pump_id
);
CREATE POLICY "Owners can view their own transactions." ON transactions FOR SELECT USING (
  vehicle_no IN (SELECT vehicle_no FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Operators can insert transactions." ON transactions FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator' AND status = 'approved')
);

-- 6. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_global_settings_updated_at
BEFORE UPDATE ON global_settings
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
