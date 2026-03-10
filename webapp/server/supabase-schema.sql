-- ═══════════════════════════════════════════════════════════
-- Cosmorare — Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up all tables.
-- ═══════════════════════════════════════════════════════════

-- ─── Profiles ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  address TEXT PRIMARY KEY,
  public_key TEXT NOT NULL,
  alias TEXT,
  encrypted_private_key JSONB,
  balance NUMERIC NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 0,
  level_name TEXT DEFAULT 'Particle',
  level_title TEXT DEFAULT 'Quantum Seed',
  level_symbol TEXT DEFAULT '•',
  reward_multiplier NUMERIC DEFAULT 1,
  streak_days INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT 0
);

-- ─── Warts (NFTs / Cosmorares) ─────────────────────────────

CREATE TABLE IF NOT EXISTS warts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  media_type TEXT DEFAULT 'image',
  creator TEXT NOT NULL REFERENCES profiles(address),
  owner TEXT NOT NULL REFERENCES profiles(address),
  price NUMERIC,
  listed BOOLEAN DEFAULT FALSE,
  royalty_percent NUMERIC DEFAULT 5,
  edition_type TEXT DEFAULT 'unique',
  max_editions INTEGER,
  edition_number INTEGER DEFAULT 1,
  available_until BIGINT,
  cert_id TEXT,
  content_fingerprint TEXT,
  creator_signature TEXT,
  on_chain_svg TEXT,
  cosmo_code_id TEXT,
  compression_ratio NUMERIC,
  on_chain_tx_id TEXT,
  storage_mode TEXT DEFAULT 'hybrid',
  price_fiat NUMERIC,
  fiat_currency TEXT,
  vault_backup BOOLEAN DEFAULT FALSE,
  media_path TEXT,
  audio_cover_path TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_warts_owner ON warts(owner);
CREATE INDEX IF NOT EXISTS idx_warts_creator ON warts(creator);
CREATE INDEX IF NOT EXISTS idx_warts_listed ON warts(listed) WHERE listed = TRUE;

-- ─── Wart History (Transfer Provenance) ────────────────────

CREATE TABLE IF NOT EXISTS wart_history (
  id BIGSERIAL PRIMARY KEY,
  wart_id TEXT NOT NULL REFERENCES warts(id) ON DELETE CASCADE,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  price NUMERIC,
  tx_id TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wart_history_wart ON wart_history(wart_id);

-- ─── Wart Comments ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wart_comments (
  id TEXT PRIMARY KEY,
  wart_id TEXT NOT NULL REFERENCES warts(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_alias TEXT,
  content TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_wart_comments_wart ON wart_comments(wart_id);

-- ─── Certificates ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS certificates (
  cert_id TEXT PRIMARY KEY,
  content_fingerprint TEXT NOT NULL,
  creator_signature TEXT,
  creator TEXT NOT NULL,
  wart_id TEXT REFERENCES warts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  issued_at BIGINT NOT NULL
);

-- ─── Transactions ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_type TEXT NOT NULL,
  signature TEXT,
  memo TEXT,
  resonance_score NUMERIC,
  confirmations INTEGER DEFAULT 0,
  layer INTEGER,
  mesh_depth INTEGER,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions(from_addr);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions(to_addr);
CREATE INDEX IF NOT EXISTS idx_tx_time ON transactions(created_at DESC);

-- ─── Social Profiles ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_profiles (
  address TEXT PRIMARY KEY REFERENCES profiles(address),
  alias TEXT,
  bio TEXT DEFAULT '',
  website TEXT DEFAULT '',
  instagram TEXT DEFAULT '',
  twitter TEXT DEFAULT '',
  joined_at BIGINT NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL DEFAULT 0
);

-- ─── Social Follows ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_follows (
  id BIGSERIAL PRIMARY KEY,
  follower_address TEXT NOT NULL,
  following_address TEXT NOT NULL,
  relationship TEXT DEFAULT 'follow',
  created_at BIGINT NOT NULL,
  UNIQUE(follower_address, following_address, relationship)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON social_follows(follower_address);
CREATE INDEX IF NOT EXISTS idx_follows_following ON social_follows(following_address);

-- ─── Notifications ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id BIGSERIAL PRIMARY KEY,
  recipient TEXT NOT NULL,
  sender TEXT,
  notif_type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT DEFAULT '',
  ref_id TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notif_recipient ON notifications(recipient, created_at DESC);

-- ═══════════════════════════════════════════════════════════
-- CosmoChain Tables (Block + Transaction persistence)
-- ═══════════════════════════════════════════════════════════

-- ─── Chain Blocks (Shard Blocks) ───────────────────────────

CREATE TABLE IF NOT EXISTS chain_blocks (
  block_key TEXT PRIMARY KEY,
  shard_id INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  parent_hash TEXT NOT NULL,
  state_root TEXT NOT NULL,
  transactions_root TEXT NOT NULL,
  block_hash TEXT NOT NULL,
  validator TEXT NOT NULL,
  tx_count INTEGER DEFAULT 0,
  processing_time_ms REAL DEFAULT 0,
  cosmo_code_svg TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_blocks_shard ON chain_blocks(shard_id, block_number);
CREATE INDEX IF NOT EXISTS idx_chain_blocks_time ON chain_blocks(created_at DESC);

-- ─── Chain Beacons ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chain_beacons (
  beacon_number INTEGER PRIMARY KEY,
  shard_roots TEXT[] NOT NULL,
  shard_heads INTEGER[] NOT NULL,
  global_state_root TEXT NOT NULL,
  beacon_hash TEXT NOT NULL,
  validator TEXT NOT NULL,
  created_at BIGINT NOT NULL
);

-- ─── Chain Transactions ────────────────────────────────────

CREATE TABLE IF NOT EXISTS chain_transactions (
  id TEXT PRIMARY KEY,
  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_type TEXT NOT NULL,
  shard_id INTEGER NOT NULL,
  nonce INTEGER NOT NULL DEFAULT 0,
  signature TEXT NOT NULL,
  public_key TEXT,
  memo TEXT,
  block_number INTEGER,
  beacon_block INTEGER,
  status TEXT DEFAULT 'confirmed',
  confirmations INTEGER DEFAULT 0,
  on_chain_data TEXT,
  created_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chain_tx_shard ON chain_transactions(shard_id, block_number);
CREATE INDEX IF NOT EXISTS idx_chain_tx_from ON chain_transactions(from_addr);
CREATE INDEX IF NOT EXISTS idx_chain_tx_to ON chain_transactions(to_addr);

-- ─── Fiat Transactions ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS fiat_transactions (
  id TEXT PRIMARY KEY,
  tx_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  fiat_amount NUMERIC NOT NULL,
  fiat_currency TEXT NOT NULL,
  warp_amount NUMERIC NOT NULL,
  buyer_address TEXT,
  seller_address TEXT,
  payment_method TEXT,
  processor_ref TEXT,
  wart_id TEXT,
  platform_fee NUMERIC DEFAULT 0,
  processor_fee NUMERIC DEFAULT 0,
  error TEXT,
  created_at BIGINT NOT NULL,
  completed_at BIGINT
);

CREATE INDEX IF NOT EXISTS idx_fiat_tx_buyer ON fiat_transactions(buyer_address);
CREATE INDEX IF NOT EXISTS idx_fiat_tx_seller ON fiat_transactions(seller_address);

-- ═══════════════════════════════════════════════════════════
-- RPC Functions (Atomic Operations)
-- ═══════════════════════════════════════════════════════════

-- Atomic balance transfer
CREATE OR REPLACE FUNCTION transfer_balance(
  p_from TEXT,
  p_to TEXT,
  p_amount NUMERIC
) RETURNS BOOLEAN AS $$
DECLARE
  sender_balance NUMERIC;
BEGIN
  -- Lock sender row
  SELECT balance INTO sender_balance FROM profiles WHERE address = p_from FOR UPDATE;
  IF sender_balance IS NULL OR sender_balance < p_amount THEN
    RETURN FALSE;
  END IF;

  UPDATE profiles SET balance = balance - p_amount, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000
    WHERE address = p_from;
  UPDATE profiles SET balance = balance + p_amount, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000
    WHERE address = p_to;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Atomic wart purchase
CREATE OR REPLACE FUNCTION purchase_wart(
  p_wart_id TEXT,
  p_buyer TEXT,
  p_price NUMERIC,
  p_royalty_amount NUMERIC,
  p_creator TEXT,
  p_seller TEXT,
  p_tx_id TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  buyer_balance NUMERIC;
  wart_owner TEXT;
BEGIN
  -- Lock buyer and verify balance
  SELECT balance INTO buyer_balance FROM profiles WHERE address = p_buyer FOR UPDATE;
  IF buyer_balance IS NULL OR buyer_balance < p_price THEN
    RETURN FALSE;
  END IF;

  -- Verify wart ownership
  SELECT owner INTO wart_owner FROM warts WHERE id = p_wart_id FOR UPDATE;
  IF wart_owner IS NULL OR wart_owner != p_seller THEN
    RETURN FALSE;
  END IF;

  -- Transfer balance: buyer → seller (minus royalty)
  UPDATE profiles SET balance = balance - p_price WHERE address = p_buyer;
  UPDATE profiles SET balance = balance + (p_price - p_royalty_amount) WHERE address = p_seller;

  -- Royalty to creator
  IF p_royalty_amount > 0 AND p_creator != p_seller THEN
    UPDATE profiles SET balance = balance + p_royalty_amount WHERE address = p_creator;
  END IF;

  -- Transfer wart ownership
  UPDATE warts SET owner = p_buyer, listed = FALSE, price = NULL, updated_at = EXTRACT(EPOCH FROM NOW()) * 1000
    WHERE id = p_wart_id;

  -- Record history
  INSERT INTO wart_history (wart_id, from_addr, to_addr, price, tx_id, created_at)
    VALUES (p_wart_id, p_seller, p_buyer, p_price, p_tx_id, EXTRACT(EPOCH FROM NOW()) * 1000);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════
-- Enable Realtime for chain tables
-- ═══════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE chain_blocks;
ALTER PUBLICATION supabase_realtime ADD TABLE chain_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE chain_beacons;
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (RLS) — Enable for production
-- ═══════════════════════════════════════════════════════════

-- Profiles: anyone can read, only the service role or address owner can write.
-- Note: Cosmorare uses service_role key server-side; client writes go through
--       server functions, so RLS restricts direct client access.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE
  USING (auth.uid()::text = address OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT
  WITH CHECK (auth.uid()::text = address OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Chain data: public read, only service role can write (validated server-side)
ALTER TABLE chain_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chain blocks are public" ON chain_blocks FOR SELECT USING (true);
CREATE POLICY "Service role can insert blocks" ON chain_blocks FOR INSERT
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

ALTER TABLE chain_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Chain txs are public" ON chain_transactions FOR SELECT USING (true);
CREATE POLICY "Service role can insert txs" ON chain_transactions FOR INSERT
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

ALTER TABLE chain_beacons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Beacons are public" ON chain_beacons FOR SELECT USING (true);
CREATE POLICY "Service role can insert beacons" ON chain_beacons FOR INSERT
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Warts: public read, only owner can update/delete, service role can do all
ALTER TABLE warts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Warts are public" ON warts FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert warts" ON warts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Owner can update own warts" ON warts FOR UPDATE
  USING (auth.uid()::text = owner OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Owner can delete own warts" ON warts FOR DELETE
  USING (auth.uid()::text = owner OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Transactions: public read, service role writes
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Transactions are public" ON transactions FOR SELECT USING (true);
CREATE POLICY "Service role can insert transactions" ON transactions FOR INSERT
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Fiat transactions: only service role
ALTER TABLE fiat_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Fiat txs viewable by owner" ON fiat_transactions FOR SELECT
  USING (auth.uid()::text = buyer_address OR current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
CREATE POLICY "Service role can insert fiat txs" ON fiat_transactions FOR INSERT
  WITH CHECK (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');
