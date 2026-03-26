-- ============================================================
-- Strangrz — Phase 5 Schema: Performance & Query Optimization
-- ============================================================

-- ─── Composite indexes for marketplace queries ───────────

-- Marketplace listing: listed warts sorted by creation date
CREATE INDEX IF NOT EXISTS idx_warts_marketplace
  ON warts (listed, created_at DESC)
  WHERE listed = true AND price IS NOT NULL;

-- Creator portfolio: all warts by a creator, newest first
CREATE INDEX IF NOT EXISTS idx_warts_creator_date
  ON warts (creator, created_at DESC);

-- Owner collection: all warts owned by an address
CREATE INDEX IF NOT EXISTS idx_warts_owner
  ON warts (owner);

-- Price range filtering
CREATE INDEX IF NOT EXISTS idx_warts_price_range
  ON warts (price, listed)
  WHERE listed = true AND price IS NOT NULL;

-- Media type + listed (for gallery tabs)
CREATE INDEX IF NOT EXISTS idx_warts_media_listed
  ON warts (media_type, listed, created_at DESC)
  WHERE listed = true;

-- ─── Transaction query optimization ──────────────────────

-- User transactions (from or to)
CREATE INDEX IF NOT EXISTS idx_tx_from ON transactions (from_addr, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_to ON transactions (to_addr, created_at DESC);

-- Transaction type filtering
CREATE INDEX IF NOT EXISTS idx_tx_type ON transactions (tx_type, created_at DESC);

-- ─── Social query optimization ───────────────────────────

-- Follower/following lookups
CREATE INDEX IF NOT EXISTS idx_follows_follower ON social_follows (follower_address, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_follows_following ON social_follows (following_address);

-- ─── Notification optimization ───────────────────────────

-- Recipient + unread (for badge count)
CREATE INDEX IF NOT EXISTS idx_notif_recipient_unread
  ON notifications (recipient, read, created_at DESC)
  WHERE read = false;

-- ─── Auction optimization ────────────────────────────────

-- Active auctions ending soonest
CREATE INDEX IF NOT EXISTS idx_auctions_active_end
  ON auctions (end_time ASC)
  WHERE status = 'active';

-- Bids by auction (for bid history)
CREATE INDEX IF NOT EXISTS idx_bids_auction_time
  ON bids (auction_id, created_at DESC);

-- ─── Connection pooling (pgBouncer) ──────────────────────
-- Note: Enable pgBouncer in Supabase dashboard:
--   Settings → Database → Connection Pooling → Enable
--   Mode: Transaction (recommended for serverless)
--   Pool Size: 15 (default, adjust based on load)

-- ─── pg_stat_statements for query monitoring ─────────────
-- Note: Enable in Supabase dashboard:
--   SQL Editor → CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
-- Then query top slow queries:
--   SELECT query, calls, mean_exec_time, total_exec_time
--   FROM pg_stat_statements
--   ORDER BY mean_exec_time DESC LIMIT 20;

-- ─── Optimized marketplace query (example) ───────────────
-- Instead of: SELECT * FROM warts WHERE listed = true ORDER BY created_at DESC
-- Use: SELECT id, title, price, creator, media_type, created_at, media_path, preview_path
--      FROM warts WHERE listed = true AND price IS NOT NULL
--      ORDER BY created_at DESC LIMIT 50 OFFSET 0;
-- This uses idx_warts_marketplace and returns only needed columns.

-- ─── Materialized view for trending scores ───────────────

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_wart_trending AS
SELECT
  w.id AS wart_id,
  w.title,
  w.creator,
  w.price,
  w.media_type,
  w.created_at,
  COALESCE(likes.cnt, 0) AS like_count,
  COALESCE(comments.cnt, 0) AS comment_count,
  COALESCE(sales.cnt, 0) AS sale_count,
  -- Trending score: (likes*2 + comments*3 + sales*10) * decay
  (COALESCE(likes.cnt, 0) * 2 + COALESCE(comments.cnt, 0) * 3 + COALESCE(sales.cnt, 0) * 10)
    * GREATEST(0.1, 1.0 / (1.0 + EXTRACT(EPOCH FROM NOW() - TO_TIMESTAMP(w.created_at / 1000)) / 86400))
    AS trending_score
FROM warts w
LEFT JOIN (SELECT wart_id, COUNT(*) AS cnt FROM wart_likes GROUP BY wart_id) likes ON likes.wart_id = w.id
LEFT JOIN (SELECT wart_id, COUNT(*) AS cnt FROM wart_comments GROUP BY wart_id) comments ON comments.wart_id = w.id
LEFT JOIN (SELECT wart_id, COUNT(*) AS cnt FROM wart_history WHERE price > 0 GROUP BY wart_id) sales ON sales.wart_id = w.id
WHERE w.listed = true AND w.price IS NOT NULL
ORDER BY trending_score DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trending_id ON mv_wart_trending (wart_id);

-- Refresh the materialized view hourly (call via Supabase cron or pg_cron):
-- SELECT cron.schedule('refresh-trending', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY mv_wart_trending');
