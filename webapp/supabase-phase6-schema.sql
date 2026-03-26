-- ============================================================
-- Strangrz — Phase 6 Schema: Governance, Disputes, Subscriptions
-- ============================================================

-- ─── Proposals (DAO Governance) ───────────────────────────

CREATE TABLE IF NOT EXISTS proposals (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  proposal_type   TEXT NOT NULL,  -- parameter_change | treasury_spend | feature_request | community
  creator         TEXT NOT NULL REFERENCES profiles(address),
  status          TEXT NOT NULL DEFAULT 'active',
  votes_for       NUMERIC DEFAULT 0,
  votes_against   NUMERIC DEFAULT 0,
  votes_abstain   NUMERIC DEFAULT 0,
  voter_count     INT DEFAULT 0,
  quorum          NUMERIC NOT NULL,
  deadline        BIGINT NOT NULL,
  execution_delay BIGINT DEFAULT 86400000,
  param_key       TEXT,
  param_value     TEXT,
  treasury_amount NUMERIC,
  treasury_recipient TEXT,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  executed_at     BIGINT
);

CREATE TABLE IF NOT EXISTS votes (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  proposal_id     TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  voter           TEXT NOT NULL REFERENCES profiles(address),
  choice          TEXT NOT NULL,  -- for | against | abstain
  weight          NUMERIC NOT NULL,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  UNIQUE (proposal_id, voter)
);

CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals (status);
CREATE INDEX IF NOT EXISTS idx_proposals_deadline ON proposals (deadline);
CREATE INDEX IF NOT EXISTS idx_votes_proposal ON votes (proposal_id);

ALTER TABLE proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "proposals_select" ON proposals FOR SELECT USING (true);
CREATE POLICY "proposals_insert" ON proposals FOR INSERT
  WITH CHECK (creator = current_setting('request.headers', true)::json->>'x-strangrz-address');

CREATE POLICY "votes_select" ON votes FOR SELECT USING (true);
CREATE POLICY "votes_insert" ON votes FOR INSERT
  WITH CHECK (voter = current_setting('request.headers', true)::json->>'x-strangrz-address');

-- ─── Disputes ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disputes (
  id              TEXT PRIMARY KEY,
  reporter        TEXT NOT NULL REFERENCES profiles(address),
  reported_wart   TEXT NOT NULL REFERENCES warts(id),
  reported_creator TEXT NOT NULL REFERENCES profiles(address),
  reason          TEXT NOT NULL,  -- copyright | fraud | inappropriate | spam | other
  evidence        TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending_review',
  resolver        TEXT,
  resolution      TEXT,
  counter_notice  TEXT,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  resolved_at     BIGINT
);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
CREATE INDEX IF NOT EXISTS idx_disputes_wart ON disputes (reported_wart);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_select" ON disputes FOR SELECT USING (true);
CREATE POLICY "disputes_insert" ON disputes FOR INSERT
  WITH CHECK (reporter = current_setting('request.headers', true)::json->>'x-strangrz-address');
CREATE POLICY "disputes_update" ON disputes FOR UPDATE
  USING (
    reporter = current_setting('request.headers', true)::json->>'x-strangrz-address'
    OR reported_creator = current_setting('request.headers', true)::json->>'x-strangrz-address'
  );

-- ─── Subscriptions ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS creator_subscription_configs (
  creator_address TEXT PRIMARY KEY REFERENCES profiles(address),
  tiers_json      JSONB NOT NULL,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id              TEXT PRIMARY KEY,
  subscriber      TEXT NOT NULL REFERENCES profiles(address),
  creator         TEXT NOT NULL REFERENCES profiles(address),
  tier            TEXT NOT NULL DEFAULT 'free',
  started_at      BIGINT NOT NULL,
  expires_at      BIGINT NOT NULL,
  auto_renew      BOOLEAN DEFAULT TRUE,
  total_paid      NUMERIC DEFAULT 0,
  UNIQUE (subscriber, creator)
);

CREATE INDEX IF NOT EXISTS idx_subs_creator ON subscriptions (creator);
CREATE INDEX IF NOT EXISTS idx_subs_subscriber ON subscriptions (subscriber);
CREATE INDEX IF NOT EXISTS idx_subs_expires ON subscriptions (expires_at);

ALTER TABLE creator_subscription_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sub_configs_select" ON creator_subscription_configs FOR SELECT USING (true);
CREATE POLICY "sub_configs_upsert" ON creator_subscription_configs FOR INSERT
  WITH CHECK (creator_address = current_setting('request.headers', true)::json->>'x-strangrz-address');

CREATE POLICY "subs_select" ON subscriptions FOR SELECT USING (true);
CREATE POLICY "subs_insert" ON subscriptions FOR INSERT
  WITH CHECK (subscriber = current_setting('request.headers', true)::json->>'x-strangrz-address');
CREATE POLICY "subs_update" ON subscriptions FOR UPDATE
  USING (subscriber = current_setting('request.headers', true)::json->>'x-strangrz-address');
