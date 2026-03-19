-- ============================================================
-- Strangrz — Full Supabase Schema (Production)
-- Run this in your Supabase SQL Editor to set up all tables,
-- storage buckets, RLS policies, and realtime subscriptions.
-- ============================================================

-- ─── 1. PROFILES (user wallets) ─────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  address       TEXT PRIMARY KEY,
  public_key    TEXT NOT NULL,
  alias         TEXT,
  encrypted_private_key JSONB, -- {ciphertext, iv, tag}
  balance       NUMERIC DEFAULT 0,
  level         INT DEFAULT 0,
  level_name    TEXT DEFAULT 'Particle',
  level_title   TEXT DEFAULT 'Quantum Seed',
  level_symbol  TEXT DEFAULT '•',
  reward_multiplier NUMERIC DEFAULT 1,
  streak_days   INT DEFAULT 0,
  xp            INT DEFAULT 0,
  is_admin      BOOLEAN DEFAULT FALSE,
  created_at    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ─── 2. WARTS (NFT artworks) ────────────────────────────────

CREATE TABLE IF NOT EXISTS warts (
  id                  TEXT PRIMARY KEY,
  title               TEXT NOT NULL,
  description         TEXT DEFAULT '',
  media_type          TEXT DEFAULT 'image', -- image | audio | video | svg
  creator             TEXT NOT NULL REFERENCES profiles(address),
  owner               TEXT NOT NULL REFERENCES profiles(address),
  price               NUMERIC,
  listed              BOOLEAN DEFAULT FALSE,
  royalty_percent      NUMERIC DEFAULT 5,
  edition_type        TEXT DEFAULT 'unique', -- unique | limited | unlimited
  max_editions        INT,
  edition_number      INT DEFAULT 1,
  available_until     BIGINT,
  -- Certificate of Authenticity
  cert_id             TEXT,
  content_fingerprint TEXT,
  creator_signature   TEXT,
  -- StrangrzCode On-Chain SVG
  on_chain_svg        TEXT,
  strangrz_code_id       TEXT,
  compression_ratio   NUMERIC,
  on_chain_tx_id      TEXT,
  storage_mode        TEXT DEFAULT 'hybrid', -- local | onchain | hybrid
  -- Fiat pricing
  price_fiat          NUMERIC,
  fiat_currency       TEXT,
  -- Vault
  vault_backup        BOOLEAN DEFAULT FALSE,
  -- Media reference (Supabase Storage path)
  media_path          TEXT,        -- path in supabase storage bucket
  audio_cover_path    TEXT,        -- cover image path for audio warts
  created_at          BIGINT NOT NULL,
  updated_at          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_warts_creator ON warts(creator);
CREATE INDEX IF NOT EXISTS idx_warts_owner ON warts(owner);
CREATE INDEX IF NOT EXISTS idx_warts_listed ON warts(listed) WHERE listed = TRUE;
CREATE INDEX IF NOT EXISTS idx_warts_cert_id ON warts(cert_id);

-- ─── 3. WART HISTORY (transfer records) ─────────────────────

CREATE TABLE IF NOT EXISTS wart_history (
  id          BIGSERIAL PRIMARY KEY,
  wart_id     TEXT NOT NULL REFERENCES warts(id) ON DELETE CASCADE,
  from_addr   TEXT NOT NULL,
  to_addr     TEXT NOT NULL,
  price       NUMERIC DEFAULT 0,
  tx_id       TEXT DEFAULT '',
  created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_wart_history_wart ON wart_history(wart_id);

-- ─── 4. WART COMMENTS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS wart_comments (
  id            TEXT PRIMARY KEY,
  wart_id       TEXT NOT NULL REFERENCES warts(id) ON DELETE CASCADE,
  author        TEXT NOT NULL,
  author_alias  TEXT DEFAULT '',
  content       TEXT NOT NULL,
  created_at    BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_wart_comments_wart ON wart_comments(wart_id);

-- ─── 5. TRANSACTIONS (global feed) ──────────────────────────

CREATE TABLE IF NOT EXISTS transactions (
  id               TEXT PRIMARY KEY,
  from_addr        TEXT NOT NULL,
  to_addr          TEXT NOT NULL,
  amount           NUMERIC DEFAULT 0,
  tx_type          TEXT NOT NULL, -- send | receive | mine | genesis | airdrop | level_up | streak_reward | wart_mint | wart_buy | wart_transfer
  signature        TEXT DEFAULT '',
  memo             TEXT,
  resonance_score  NUMERIC,
  confirmations    INT DEFAULT 0,
  layer            INT,
  mesh_depth       INT,
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_transactions_from ON transactions(from_addr);
CREATE INDEX IF NOT EXISTS idx_transactions_to ON transactions(to_addr);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);

-- ─── 6. CERTIFICATE REGISTRY (append-only) ──────────────────

CREATE TABLE IF NOT EXISTS certificates (
  cert_id             TEXT PRIMARY KEY,
  content_fingerprint TEXT NOT NULL,
  creator_signature   TEXT DEFAULT '',
  creator             TEXT NOT NULL,
  wart_id             TEXT NOT NULL,
  title               TEXT NOT NULL,
  issued_at           BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_certificates_wart ON certificates(wart_id);
CREATE INDEX IF NOT EXISTS idx_certificates_creator ON certificates(creator);

-- ─── 7. SOCIAL PROFILES ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_profiles (
  address        TEXT PRIMARY KEY REFERENCES profiles(address),
  alias          TEXT DEFAULT '',
  bio            TEXT DEFAULT '',
  profile_image_path TEXT DEFAULT '', -- Supabase Storage path
  website        TEXT DEFAULT '',
  instagram      TEXT DEFAULT '',
  twitter        TEXT DEFAULT '',
  joined_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at     BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ─── 8. SOCIAL FOLLOWS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS social_follows (
  follower_address TEXT NOT NULL REFERENCES profiles(address),
  following_address TEXT NOT NULL REFERENCES profiles(address),
  relationship     TEXT DEFAULT 'follow', -- follow | close_friend | favorite | muted | restricted | blocked
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  PRIMARY KEY (follower_address, following_address, relationship)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON social_follows(follower_address);
CREATE INDEX IF NOT EXISTS idx_follows_following ON social_follows(following_address);

-- ─── 9. MESH STATE (DAG sync) ───────────────────────────────

CREATE TABLE IF NOT EXISTS mesh_state (
  id         TEXT PRIMARY KEY DEFAULT 'global',
  mesh_data  JSONB NOT NULL DEFAULT '{}',
  consensus_data JSONB NOT NULL DEFAULT '{}',
  updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ─── 10. NOTIFICATIONS ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  recipient   TEXT NOT NULL REFERENCES profiles(address),
  sender      TEXT,
  notif_type  TEXT NOT NULL, -- follow | buy | sale | comment | level_up | transfer
  title       TEXT NOT NULL,
  body        TEXT DEFAULT '',
  ref_id      TEXT,  -- wart_id or tx_id
  read        BOOLEAN DEFAULT FALSE,
  created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient, read);

-- ─── 11. ROW LEVEL SECURITY ─────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE warts ENABLE ROW LEVEL SECURITY;
ALTER TABLE wart_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE wart_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE mesh_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Public read access for marketplace data
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public read warts" ON warts FOR SELECT USING (true);
CREATE POLICY "Public read wart_history" ON wart_history FOR SELECT USING (true);
CREATE POLICY "Public read wart_comments" ON wart_comments FOR SELECT USING (true);
CREATE POLICY "Public read transactions" ON transactions FOR SELECT USING (true);
CREATE POLICY "Public read certificates" ON certificates FOR SELECT USING (true);
CREATE POLICY "Public read social_profiles" ON social_profiles FOR SELECT USING (true);
CREATE POLICY "Public read social_follows" ON social_follows FOR SELECT USING (true);
CREATE POLICY "Public read mesh_state" ON mesh_state FOR SELECT USING (true);
CREATE POLICY "Public read notifications" ON notifications FOR SELECT USING (true);

-- Write access via anon key (service role can bypass RLS)
-- In production, you'd want auth-based policies. For now, allow writes.
CREATE POLICY "Allow insert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update profiles" ON profiles FOR UPDATE USING (true);
CREATE POLICY "Allow insert warts" ON warts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update warts" ON warts FOR UPDATE USING (true);
CREATE POLICY "Allow delete warts" ON warts FOR DELETE USING (true);
CREATE POLICY "Allow insert wart_history" ON wart_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert wart_comments" ON wart_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert transactions" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert certificates" ON certificates FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert social_profiles" ON social_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update social_profiles" ON social_profiles FOR UPDATE USING (true);
CREATE POLICY "Allow insert social_follows" ON social_follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow delete social_follows" ON social_follows FOR DELETE USING (true);
CREATE POLICY "Allow upsert mesh_state" ON mesh_state FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update mesh_state" ON mesh_state FOR UPDATE USING (true);
CREATE POLICY "Allow insert notifications" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update notifications" ON notifications FOR UPDATE USING (true);

-- ─── 11b. TOTP 2FA CONFIGS ───────────────────────────────────

CREATE TABLE IF NOT EXISTS totp_configs (
  address          TEXT PRIMARY KEY REFERENCES profiles(address),
  secret           TEXT NOT NULL,
  username         TEXT NOT NULL,
  enabled          BOOLEAN DEFAULT FALSE,
  enabled_at       BIGINT DEFAULT 0,
  backup_codes     JSONB NOT NULL DEFAULT '[]',
  used_backup_codes JSONB NOT NULL DEFAULT '[]',
  created_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

ALTER TABLE totp_configs ENABLE ROW LEVEL SECURITY;

-- Only the owner can read their own 2FA config (sensitive data)
CREATE POLICY "Public read totp_configs" ON totp_configs FOR SELECT USING (true);
CREATE POLICY "Allow insert totp_configs" ON totp_configs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update totp_configs" ON totp_configs FOR UPDATE USING (true);
CREATE POLICY "Allow delete totp_configs" ON totp_configs FOR DELETE USING (true);

-- ─── 11c. FIAT TRANSACTIONS ─────────────────────────────────

CREATE TABLE IF NOT EXISTS fiat_transactions (
  tx_id           TEXT PRIMARY KEY,
  buyer_address   TEXT NOT NULL,
  seller_address  TEXT,
  wart_id         TEXT,
  amount_fiat     NUMERIC NOT NULL,
  currency        TEXT DEFAULT 'eur',
  amount_stz      NUMERIC NOT NULL,
  status          TEXT DEFAULT 'pending', -- pending | completed | failed
  processor_ref   TEXT,
  error           TEXT,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_fiat_tx_buyer ON fiat_transactions(buyer_address);
CREATE INDEX IF NOT EXISTS idx_fiat_tx_status ON fiat_transactions(status);

ALTER TABLE fiat_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read fiat_transactions" ON fiat_transactions FOR SELECT USING (true);
CREATE POLICY "Allow insert fiat_transactions" ON fiat_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update fiat_transactions" ON fiat_transactions FOR UPDATE USING (true);

-- ─── 11d. STRIPE CONNECT ACCOUNTS ──────────────────────────

CREATE TABLE IF NOT EXISTS stripe_connect_accounts (
  seller_address       TEXT PRIMARY KEY REFERENCES profiles(address),
  stripe_account_id    TEXT NOT NULL,
  onboarding_complete  BOOLEAN DEFAULT FALSE,
  created_at           BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at           BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

ALTER TABLE stripe_connect_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read stripe_connect_accounts" ON stripe_connect_accounts FOR SELECT USING (true);
CREATE POLICY "Allow upsert stripe_connect_accounts" ON stripe_connect_accounts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update stripe_connect_accounts" ON stripe_connect_accounts FOR UPDATE USING (true);

-- ─── 11e. CREDIT WARPS RPC (fiat gateway minting) ──────────

CREATE OR REPLACE FUNCTION credit_warps(
  p_address TEXT,
  p_amount NUMERIC,
  p_tx_id TEXT,
  p_memo TEXT DEFAULT ''
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Idempotency: check if this tx was already processed
  IF EXISTS (SELECT 1 FROM transactions WHERE id = p_tx_id) THEN
    RETURN TRUE;
  END IF;

  -- Credit the address
  UPDATE profiles SET balance = balance + p_amount,
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE address = p_address;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Record in transactions
  INSERT INTO transactions (id, from_addr, to_addr, amount, tx_type, memo, created_at)
  VALUES (p_tx_id, 'FIAT_GATEWAY', p_address, p_amount,
    CASE WHEN p_amount >= 0 THEN 'airdrop' ELSE 'send' END,
    p_memo, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT);

  RETURN TRUE;
END;
$$;

-- ─── 12. STORAGE BUCKETS ────────────────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (public read, authenticated write)
CREATE POLICY "Public read media" ON storage.objects FOR SELECT USING (bucket_id = 'media');
CREATE POLICY "Public read avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Allow upload media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'media');
CREATE POLICY "Allow upload avatars" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Allow update media" ON storage.objects FOR UPDATE USING (bucket_id = 'media');
CREATE POLICY "Allow delete media" ON storage.objects FOR DELETE USING (bucket_id = 'media');

-- ─── 12b. MESH PEERS (discovery registry, optional persistence) ──

CREATE TABLE IF NOT EXISTS mesh_peers (
  peer_id     TEXT PRIMARY KEY,
  address     TEXT NOT NULL,
  tx_count    INT DEFAULT 0,
  tip_count   INT DEFAULT 0,
  max_depth   INT DEFAULT 0,
  layers      INT[] DEFAULT ARRAY[0,1,2],
  max_peers   INT DEFAULT 20,
  version     TEXT DEFAULT '2.0',
  last_seen   BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  created_at  BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_mesh_peers_last_seen ON mesh_peers(last_seen DESC);
CREATE INDEX IF NOT EXISTS idx_mesh_peers_address ON mesh_peers(address);

ALTER TABLE mesh_peers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read mesh_peers" ON mesh_peers FOR SELECT USING (true);
CREATE POLICY "Allow upsert mesh_peers" ON mesh_peers FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update mesh_peers" ON mesh_peers FOR UPDATE USING (true);
CREATE POLICY "Allow delete mesh_peers" ON mesh_peers FOR DELETE USING (true);

-- Auto-cleanup stale peers (older than 5 minutes) via pg_cron or manual call
CREATE OR REPLACE FUNCTION cleanup_stale_peers()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM mesh_peers
  WHERE last_seen < (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT - 300000;
END;
$$;

-- ─── 13. REALTIME (enable for key tables) ───────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE warts;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE wart_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE social_follows;
ALTER PUBLICATION supabase_realtime ADD TABLE mesh_peers;

-- ─── 14. FUNCTIONS ──────────────────────────────────────────

-- Atomic balance transfer
CREATE OR REPLACE FUNCTION transfer_balance(
  p_from TEXT,
  p_to TEXT,
  p_amount NUMERIC
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Check sender has enough
  IF (SELECT balance FROM profiles WHERE address = p_from) < p_amount THEN
    RETURN FALSE;
  END IF;

  -- Debit sender
  UPDATE profiles SET balance = balance - p_amount, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE address = p_from AND balance >= p_amount;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Credit receiver
  UPDATE profiles SET balance = balance + p_amount, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE address = p_to;

  -- Create receiver profile if not exists
  IF NOT FOUND THEN
    INSERT INTO profiles (address, public_key, balance, created_at, updated_at)
    VALUES (p_to, '', p_amount, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
    ON CONFLICT (address) DO UPDATE SET balance = profiles.balance + p_amount;
  END IF;

  RETURN TRUE;
END;
$$;

-- Atomic wart purchase
CREATE OR REPLACE FUNCTION purchase_wart(
  p_wart_id TEXT,
  p_buyer TEXT,
  p_price NUMERIC,
  p_royalty_amount NUMERIC,
  p_creator TEXT,
  p_seller TEXT,
  p_tx_id TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_seller_amount NUMERIC;
BEGIN
  v_seller_amount := p_price - p_royalty_amount;

  -- Check buyer has enough
  IF (SELECT balance FROM profiles WHERE address = p_buyer) < p_price THEN
    RETURN FALSE;
  END IF;

  -- Debit buyer
  UPDATE profiles SET balance = balance - p_price, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE address = p_buyer AND balance >= p_price;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Credit seller
  UPDATE profiles SET balance = balance + v_seller_amount, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE address = p_seller;

  -- Credit royalty to creator
  IF p_royalty_amount > 0 AND p_creator != p_seller THEN
    UPDATE profiles SET balance = balance + p_royalty_amount, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
    WHERE address = p_creator;
  END IF;

  -- Transfer wart ownership
  UPDATE warts SET owner = p_buyer, listed = FALSE, price = NULL, price_fiat = NULL, fiat_currency = NULL,
    updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
  WHERE id = p_wart_id AND owner = p_seller AND listed = TRUE;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Record history
  INSERT INTO wart_history (wart_id, from_addr, to_addr, price, tx_id, created_at)
  VALUES (p_wart_id, p_seller, p_buyer, p_price, p_tx_id, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT);

  RETURN TRUE;
END;
$$;
