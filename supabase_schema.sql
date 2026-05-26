-- =====================================================
-- 🔮 Mystic Tarot Reader — Supabase Schema
-- Run this SQL in your Supabase SQL Editor
-- =====================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── USERS TABLE ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT UNIQUE NOT NULL,
  username TEXT,
  first_name TEXT,
  display_name TEXT,
  date_of_birth TEXT,
  language TEXT DEFAULT 'en',
  is_onboarded BOOLEAN DEFAULT FALSE,
  referral_code TEXT UNIQUE,
  referred_by TEXT,
  first_purchase_done BOOLEAN DEFAULT FALSE,
  free_daily_used_at DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by telegram_id
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users(referral_code);

-- ─── READING SESSIONS TABLE ─────────────────────────────

CREATE TABLE IF NOT EXISTS reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  telegram_id BIGINT NOT NULL,
  reading_type TEXT NOT NULL,
  reader_persona TEXT,
  question TEXT,
  cards JSONB NOT NULL DEFAULT '[]',
  gemini_response TEXT,
  follow_ups JSONB DEFAULT '[]',
  language TEXT DEFAULT 'en',
  payment_status TEXT DEFAULT 'free',
  payment_id TEXT,
  is_complete BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_telegram_id ON reading_sessions(telegram_id);
CREATE INDEX IF NOT EXISTS idx_sessions_incomplete ON reading_sessions(telegram_id, is_complete, payment_status);

-- ─── PAYMENTS TABLE ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  session_id UUID REFERENCES reading_sessions(id),
  stars_amount INTEGER NOT NULL,
  telegram_payment_charge_id TEXT,
  provider_payment_charge_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_telegram_id ON payments(telegram_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(telegram_id, status);

-- ─── LANGUAGE LOGS TABLE ─────────────────────────────────

CREATE TABLE IF NOT EXISTS language_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL,
  attempted_language TEXT NOT NULL,
  resolved_to TEXT DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── REFERRAL REWARDS TABLE ─────────────────────────────

CREATE TABLE IF NOT EXISTS referral_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_telegram_id BIGINT NOT NULL,
  referred_telegram_id BIGINT NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'free_reading',
  is_claimed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_referral_referrer ON referral_rewards(referrer_telegram_id, is_claimed);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────
-- For Supabase anon key access

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_rewards ENABLE ROW LEVEL SECURITY;

-- Allow full access for service role (bot server)
-- For anon key, create permissive policies
CREATE POLICY "Allow all for anon" ON users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON reading_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON payments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON language_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for anon" ON referral_rewards FOR ALL USING (true) WITH CHECK (true);
