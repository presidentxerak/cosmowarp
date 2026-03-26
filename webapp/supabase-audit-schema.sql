-- ─── Admin Audit Log ──────────────────────────────────────────
-- Tracks all admin actions for compliance and debugging.
-- Append-only: no UPDATE or DELETE allowed.

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  action          TEXT NOT NULL,           -- e.g. 'unlock_registry', 'unlock_creator_tokens', 'delete_wart', 'ban_user'
  actor_address   TEXT NOT NULL,           -- admin wallet address
  target_address  TEXT,                    -- affected user/entity (nullable)
  target_id       TEXT,                    -- affected resource ID (wart_id, tx_id, etc.)
  details         JSONB DEFAULT '{}'::JSONB,  -- additional context
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index for querying by actor and action
CREATE INDEX IF NOT EXISTS idx_audit_actor ON admin_audit_log (actor_address);
CREATE INDEX IF NOT EXISTS idx_audit_action ON admin_audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_log (created_at DESC);

-- RLS: only service-role can INSERT, authenticated admins can SELECT
ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Public read for admin dashboard (filtered by app logic, not RLS)
CREATE POLICY "audit_select" ON admin_audit_log FOR SELECT USING (true);

-- Only service-role or the admin themselves can insert
CREATE POLICY "audit_insert" ON admin_audit_log FOR INSERT
  WITH CHECK (actor_address = current_setting('request.headers', true)::json->>'x-strangrz-address');

-- No updates or deletes (append-only)
-- (No UPDATE or DELETE policies = denied by default with RLS enabled)
