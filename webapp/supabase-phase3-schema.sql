-- ============================================================
-- Strangrz — Phase 3 Schema Additions
-- Messaging, Enhanced Notifications, Verification
-- ============================================================

-- ─── Verification columns on profiles ─────────────────────

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_verified') THEN
    ALTER TABLE profiles ADD COLUMN is_verified BOOLEAN DEFAULT FALSE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verification_status') THEN
    ALTER TABLE profiles ADD COLUMN verification_status TEXT DEFAULT 'unverified';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verified_at') THEN
    ALTER TABLE profiles ADD COLUMN verified_at BIGINT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='verified_by') THEN
    ALTER TABLE profiles ADD COLUMN verified_by TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='email') THEN
    ALTER TABLE profiles ADD COLUMN email TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_verified ON profiles (is_verified) WHERE is_verified = true;

-- ─── Notification preferences ─────────────────────────────

CREATE TABLE IF NOT EXISTS notification_preferences (
  address         TEXT PRIMARY KEY REFERENCES profiles(address),
  enabled_types   JSONB DEFAULT '{"follow":true,"buy":true,"sale":true,"comment":true,"level_up":true,"transfer":true,"like":true,"bid":true,"auction_end":true,"message":true}'::JSONB,
  sound           BOOLEAN DEFAULT TRUE,
  email_frequency TEXT DEFAULT 'never', -- instant | daily | weekly | never
  updated_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notif_prefs_select" ON notification_preferences FOR SELECT
  USING (address = current_setting('request.headers', true)::json->>'x-strangrz-address');
CREATE POLICY "notif_prefs_upsert" ON notification_preferences FOR INSERT
  WITH CHECK (address = current_setting('request.headers', true)::json->>'x-strangrz-address');
CREATE POLICY "notif_prefs_update" ON notification_preferences FOR UPDATE
  USING (address = current_setting('request.headers', true)::json->>'x-strangrz-address');

-- ─── Mark all notifications read (batch) ──────────────────

CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_address TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE notifications SET read = TRUE WHERE recipient = p_address AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── Notification count index ─────────────────────────────

CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (recipient, read)
  WHERE read = FALSE;

-- ─── Email log (prevent duplicate sends) ──────────────────

CREATE TABLE IF NOT EXISTS email_log (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient       TEXT NOT NULL,
  email_type      TEXT NOT NULL,
  ref_id          TEXT,
  sent_at         BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  resend_id       TEXT              -- Resend message ID for tracking
);

CREATE INDEX IF NOT EXISTS idx_email_log_recipient ON email_log (recipient, sent_at DESC);

ALTER TABLE email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "email_log_select" ON email_log FOR SELECT
  USING (recipient = current_setting('request.headers', true)::json->>'x-strangrz-address');
