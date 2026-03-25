-- ============================================================
-- Strangrz — Phase 4 Schema Additions
-- KYC, Royalty Tracking, Payout History
-- ============================================================

-- ─── KYC columns on profiles ──────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_level') THEN
    ALTER TABLE profiles ADD COLUMN kyc_level TEXT DEFAULT 'none';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_status') THEN
    ALTER TABLE profiles ADD COLUMN kyc_status TEXT DEFAULT 'not_started';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_submitted_at') THEN
    ALTER TABLE profiles ADD COLUMN kyc_submitted_at BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='kyc_approved_at') THEN
    ALTER TABLE profiles ADD COLUMN kyc_approved_at BIGINT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_kyc ON profiles (kyc_level);

-- ─── Royalty tracking ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS royalty_earnings (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  wart_id         TEXT NOT NULL REFERENCES warts(id),
  creator         TEXT NOT NULL REFERENCES profiles(address),
  seller          TEXT NOT NULL REFERENCES profiles(address),
  buyer           TEXT NOT NULL REFERENCES profiles(address),
  sale_price      NUMERIC NOT NULL,
  royalty_percent  NUMERIC NOT NULL,
  royalty_amount  NUMERIC NOT NULL,
  tx_id           TEXT NOT NULL,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_royalties_creator ON royalty_earnings (creator);
CREATE INDEX IF NOT EXISTS idx_royalties_wart ON royalty_earnings (wart_id);

ALTER TABLE royalty_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "royalties_select" ON royalty_earnings FOR SELECT USING (true);

-- ─── tx_type column on fiat_transactions ──────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fiat_transactions' AND column_name='tx_type') THEN
    ALTER TABLE fiat_transactions ADD COLUMN tx_type TEXT DEFAULT 'purchase';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fiat_tx_type ON fiat_transactions (tx_type);
CREATE INDEX IF NOT EXISTS idx_fiat_tx_seller ON fiat_transactions (seller_address);

-- ─── Exchange rate history ────────────────────────────────

CREATE TABLE IF NOT EXISTS exchange_rate_history (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  rates_json      JSONB NOT NULL,
  source          TEXT DEFAULT 'api',
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_rate_history_time ON exchange_rate_history (created_at DESC);

ALTER TABLE exchange_rate_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rates_select" ON exchange_rate_history FOR SELECT USING (true);
