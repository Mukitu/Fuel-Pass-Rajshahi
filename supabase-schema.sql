-- Supabase SQL Schema for Fuel Pass Rajshahi

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Users: Admin, Operator, Owner)
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    full_name TEXT NOT NULL,
    mobile TEXT UNIQUE NOT NULL,
    vehicle_no TEXT UNIQUE, -- Nullable for Admin/Operator
    fuel_type TEXT, -- e.g., Octane, Petrol, Diesel, CNG
    role TEXT NOT NULL CHECK (role IN ('admin', 'operator', 'owner')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Global Settings Table (DC Office Control)
CREATE TABLE global_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bdt_limit NUMERIC NOT NULL DEFAULT 2000,
    day_gap INTEGER NOT NULL DEFAULT 5,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Insert default global settings
INSERT INTO global_settings (bdt_limit, day_gap) VALUES (2000, 5);

-- 3. Blacklist Table
CREATE TABLE blacklist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_no TEXT UNIQUE NOT NULL,
    blocked_until TIMESTAMP WITH TIME ZONE NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Transactions Table
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_no TEXT NOT NULL,
    amount_bdt NUMERIC NOT NULL,
    pump_id UUID REFERENCES profiles(id), -- Assuming operators are pump representatives
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Row Level Security (RLS) Policies

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- Transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators can insert transactions" ON transactions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator')
);
CREATE POLICY "Owners can view their own transactions" ON transactions FOR SELECT USING (
    vehicle_no = (SELECT vehicle_no FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "Admins can view all transactions" ON transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Operators can view all transactions" ON transactions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'operator')
);

-- Global Settings
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view global settings" ON global_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can update global settings" ON global_settings FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Blacklist
ALTER TABLE blacklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view blacklist" ON blacklist FOR SELECT USING (true);
CREATE POLICY "Only admins can manage blacklist" ON blacklist FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
