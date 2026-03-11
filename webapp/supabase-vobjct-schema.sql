-- ============================================================
-- Vobjct — Supabase Schema Extension
-- Add these tables to your existing Cosmorare database.
-- ============================================================

-- ─── VOBJCT MANIFESTS ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vobjct_manifests (
  object_id           TEXT PRIMARY KEY,
  vobjct_version      TEXT NOT NULL DEFAULT '1.0.0',
  wart_id             TEXT REFERENCES warts(id) ON DELETE CASCADE,
  object_type         TEXT NOT NULL DEFAULT 'digital_art',
  namespace_name      TEXT NOT NULL DEFAULT 'Cosmorare',
  namespace_slug      TEXT NOT NULL DEFAULT 'cosmorare',

  -- Token Binding
  chain_family        TEXT NOT NULL DEFAULT 'cosmorare',
  chain_name          TEXT NOT NULL DEFAULT 'cosmochain',
  token_standard      TEXT NOT NULL DEFAULT 'CW-721',
  contract_ref        TEXT NOT NULL,
  token_ref           TEXT NOT NULL,
  owner_ref           TEXT,

  -- Canonical Asset
  canonical_sha256    TEXT NOT NULL,
  canonical_mime_type TEXT NOT NULL,
  canonical_size_bytes BIGINT DEFAULT 0,

  -- Preview Asset
  preview_sha256      TEXT,
  preview_mime_type   TEXT,
  preview_size_bytes  BIGINT,

  -- Integrity
  manifest_sha256     TEXT NOT NULL,
  integrity_status    TEXT NOT NULL DEFAULT 'verified', -- verified | unverified | mismatch

  -- Policy
  mutability          TEXT NOT NULL DEFAULT 'frozen',
  restoration_allowed BOOLEAN DEFAULT TRUE,
  migration_allowed   BOOLEAN DEFAULT TRUE,

  -- Rights
  rights_display      TEXT DEFAULT 'allowed',
  rights_commercial   TEXT DEFAULT 'personal_only',
  rights_derivatives  TEXT DEFAULT 'forbidden',
  license_version     TEXT DEFAULT '1.0.0',

  -- Manifest JSON (full)
  manifest_json       JSONB NOT NULL,

  created_at          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_vobjct_wart ON vobjct_manifests(wart_id);
CREATE INDEX IF NOT EXISTS idx_vobjct_owner ON vobjct_manifests(owner_ref);
CREATE INDEX IF NOT EXISTS idx_vobjct_chain ON vobjct_manifests(chain_family, chain_name);
CREATE INDEX IF NOT EXISTS idx_vobjct_integrity ON vobjct_manifests(integrity_status);

-- ─── VOBJCT STORAGE ROUTES ───────────────────────────────────

CREATE TABLE IF NOT EXISTS vobjct_storage_routes (
  id              BIGSERIAL PRIMARY KEY,
  object_id       TEXT NOT NULL REFERENCES vobjct_manifests(object_id) ON DELETE CASCADE,
  network         TEXT NOT NULL, -- arweave | ipfs | https | supabase | indexeddb | onchain
  locator         TEXT NOT NULL,
  priority        INT NOT NULL DEFAULT 1,
  status          TEXT NOT NULL DEFAULT 'active', -- active | degraded | unavailable
  last_checked_at BIGINT,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_vobjct_routes_object ON vobjct_storage_routes(object_id);
CREATE INDEX IF NOT EXISTS idx_vobjct_routes_status ON vobjct_storage_routes(status);

-- ─── VOBJCT SAFE CONFIGS ────────────────────────────────────

CREATE TABLE IF NOT EXISTS vobjct_safe (
  object_id           TEXT PRIMARY KEY REFERENCES vobjct_manifests(object_id) ON DELETE CASCADE,
  safe_version        TEXT NOT NULL DEFAULT '1.0.0',
  mode                TEXT NOT NULL DEFAULT 'active', -- active | passive | disabled
  health_status       TEXT NOT NULL DEFAULT 'healthy',
  min_available_routes INT DEFAULT 2,
  check_interval_hours INT DEFAULT 24,
  repair_authority_type TEXT DEFAULT 'creator_only',
  funding_model       TEXT DEFAULT 'project_treasury',
  budget_status       TEXT DEFAULT 'funded',
  config_json         JSONB NOT NULL,
  created_at          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ─── VOBJCT INCIDENTS ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS vobjct_incidents (
  id              TEXT PRIMARY KEY,
  object_id       TEXT NOT NULL REFERENCES vobjct_manifests(object_id) ON DELETE CASCADE,
  incident_type   TEXT NOT NULL, -- check | warning | degradation | repair_start | repair_success | repair_failure | policy_block
  description     TEXT NOT NULL,
  route_network   TEXT,
  route_locator   TEXT,
  action_taken    TEXT,
  previous_state  TEXT NOT NULL,
  new_state       TEXT NOT NULL,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_vobjct_incidents_object ON vobjct_incidents(object_id);
CREATE INDEX IF NOT EXISTS idx_vobjct_incidents_type ON vobjct_incidents(incident_type);
CREATE INDEX IF NOT EXISTS idx_vobjct_incidents_created ON vobjct_incidents(created_at DESC);

-- ─── VOBJCT VERIFICATION CHECKS ────────────────────────────

CREATE TABLE IF NOT EXISTS vobjct_verification_checks (
  id              BIGSERIAL PRIMARY KEY,
  object_id       TEXT NOT NULL REFERENCES vobjct_manifests(object_id) ON DELETE CASCADE,
  check_type      TEXT NOT NULL, -- manifest_hash | canonical_hash | signature | route_availability
  result          BOOLEAN NOT NULL,
  details         TEXT,
  checked_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_vobjct_checks_object ON vobjct_verification_checks(object_id);

-- ─── VOBJCT SIGNATURES ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS vobjct_signatures (
  id              BIGSERIAL PRIMARY KEY,
  object_id       TEXT NOT NULL REFERENCES vobjct_manifests(object_id) ON DELETE CASCADE,
  signer_role     TEXT NOT NULL, -- issuer | creator | owner | archive_operator | safe_operator
  algorithm       TEXT NOT NULL DEFAULT 'ed25519',
  public_key      TEXT NOT NULL,
  signature       TEXT NOT NULL,
  signed_at       BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_vobjct_signatures_object ON vobjct_signatures(object_id);

-- ─── ROW LEVEL SECURITY ────────────────────────────────────

ALTER TABLE vobjct_manifests ENABLE ROW LEVEL SECURITY;
ALTER TABLE vobjct_storage_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vobjct_safe ENABLE ROW LEVEL SECURITY;
ALTER TABLE vobjct_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE vobjct_verification_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE vobjct_signatures ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read vobjct_manifests" ON vobjct_manifests FOR SELECT USING (true);
CREATE POLICY "Public read vobjct_storage_routes" ON vobjct_storage_routes FOR SELECT USING (true);
CREATE POLICY "Public read vobjct_safe" ON vobjct_safe FOR SELECT USING (true);
CREATE POLICY "Public read vobjct_incidents" ON vobjct_incidents FOR SELECT USING (true);
CREATE POLICY "Public read vobjct_verification_checks" ON vobjct_verification_checks FOR SELECT USING (true);
CREATE POLICY "Public read vobjct_signatures" ON vobjct_signatures FOR SELECT USING (true);

-- Write access
CREATE POLICY "Allow insert vobjct_manifests" ON vobjct_manifests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update vobjct_manifests" ON vobjct_manifests FOR UPDATE USING (true);
CREATE POLICY "Allow insert vobjct_storage_routes" ON vobjct_storage_routes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update vobjct_storage_routes" ON vobjct_storage_routes FOR UPDATE USING (true);
CREATE POLICY "Allow insert vobjct_safe" ON vobjct_safe FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update vobjct_safe" ON vobjct_safe FOR UPDATE USING (true);
CREATE POLICY "Allow insert vobjct_incidents" ON vobjct_incidents FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert vobjct_verification_checks" ON vobjct_verification_checks FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert vobjct_signatures" ON vobjct_signatures FOR INSERT WITH CHECK (true);

-- ─── REALTIME ──────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE vobjct_manifests;
ALTER PUBLICATION supabase_realtime ADD TABLE vobjct_incidents;
