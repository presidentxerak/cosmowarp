-- ============================================================
-- Strangrz — Phase 2 Schema Additions
-- Collections, Auctions, Tags, Trending
-- ============================================================

-- ─── Collections ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS collections (
  id              TEXT PRIMARY KEY,
  creator         TEXT NOT NULL REFERENCES profiles(address),
  title           TEXT NOT NULL,
  description     TEXT DEFAULT '',
  cover_wart_id   TEXT,                    -- optional cover image
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS collection_warts (
  collection_id   TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  wart_id         TEXT NOT NULL REFERENCES warts(id) ON DELETE CASCADE,
  position        INT NOT NULL DEFAULT 0,  -- display order
  added_at        BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  PRIMARY KEY (collection_id, wart_id)
);

CREATE INDEX IF NOT EXISTS idx_collections_creator ON collections (creator);
CREATE INDEX IF NOT EXISTS idx_collection_warts_wart ON collection_warts (wart_id);

ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_warts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "collections_select" ON collections FOR SELECT USING (true);
CREATE POLICY "collections_insert" ON collections FOR INSERT
  WITH CHECK (creator = current_setting('request.headers', true)::json->>'x-strangrz-address');
CREATE POLICY "collections_update" ON collections FOR UPDATE
  USING (creator = current_setting('request.headers', true)::json->>'x-strangrz-address');
CREATE POLICY "collections_delete" ON collections FOR DELETE
  USING (creator = current_setting('request.headers', true)::json->>'x-strangrz-address');

CREATE POLICY "collection_warts_select" ON collection_warts FOR SELECT USING (true);
CREATE POLICY "collection_warts_insert" ON collection_warts FOR INSERT
  WITH CHECK (
    collection_id IN (
      SELECT id FROM collections
      WHERE creator = current_setting('request.headers', true)::json->>'x-strangrz-address'
    )
  );
CREATE POLICY "collection_warts_delete" ON collection_warts FOR DELETE
  USING (
    collection_id IN (
      SELECT id FROM collections
      WHERE creator = current_setting('request.headers', true)::json->>'x-strangrz-address'
    )
  );

-- ─── Auctions ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS auctions (
  id              TEXT PRIMARY KEY,
  wart_id         TEXT NOT NULL REFERENCES warts(id),
  seller          TEXT NOT NULL REFERENCES profiles(address),
  start_price     NUMERIC NOT NULL,
  reserve_price   NUMERIC DEFAULT 0,
  start_time      BIGINT NOT NULL,
  end_time        BIGINT NOT NULL,
  original_end_time BIGINT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active', -- active | ended | settled | cancelled
  highest_bid     NUMERIC DEFAULT 0,
  highest_bidder  TEXT,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  settled_at      BIGINT
);

CREATE TABLE IF NOT EXISTS bids (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auction_id      TEXT NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
  bidder          TEXT NOT NULL REFERENCES profiles(address),
  amount          NUMERIC NOT NULL,
  created_at      BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_auctions_wart ON auctions (wart_id);
CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions (status);
CREATE INDEX IF NOT EXISTS idx_auctions_end ON auctions (end_time);
CREATE INDEX IF NOT EXISTS idx_bids_auction ON bids (auction_id);

ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auctions_select" ON auctions FOR SELECT USING (true);
CREATE POLICY "auctions_insert" ON auctions FOR INSERT
  WITH CHECK (seller = current_setting('request.headers', true)::json->>'x-strangrz-address');
CREATE POLICY "auctions_update" ON auctions FOR UPDATE
  USING (seller = current_setting('request.headers', true)::json->>'x-strangrz-address');

CREATE POLICY "bids_select" ON bids FOR SELECT USING (true);
CREATE POLICY "bids_insert" ON bids FOR INSERT
  WITH CHECK (bidder = current_setting('request.headers', true)::json->>'x-strangrz-address');

-- ─── Wart Tags ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS wart_tags (
  wart_id         TEXT NOT NULL REFERENCES warts(id) ON DELETE CASCADE,
  tag             TEXT NOT NULL,
  PRIMARY KEY (wart_id, tag)
);

CREATE INDEX IF NOT EXISTS idx_wart_tags_tag ON wart_tags (tag);

ALTER TABLE wart_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tags_select" ON wart_tags FOR SELECT USING (true);
CREATE POLICY "tags_insert" ON wart_tags FOR INSERT
  WITH CHECK (
    wart_id IN (
      SELECT id FROM warts
      WHERE creator = current_setting('request.headers', true)::json->>'x-strangrz-address'
    )
  );
CREATE POLICY "tags_delete" ON wart_tags FOR DELETE
  USING (
    wart_id IN (
      SELECT id FROM warts
      WHERE creator = current_setting('request.headers', true)::json->>'x-strangrz-address'
    )
  );

-- ─── Full-Text Search on Warts ────────────────────────────

-- Add tsvector column for full-text search (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'warts' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE warts ADD COLUMN search_vector tsvector;
  END IF;
END $$;

-- Update search vector on insert/update
CREATE OR REPLACE FUNCTION warts_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.description, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS warts_search_trigger ON warts;
CREATE TRIGGER warts_search_trigger BEFORE INSERT OR UPDATE ON warts
  FOR EACH ROW EXECUTE FUNCTION warts_search_update();

-- GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_warts_search ON warts USING GIN (search_vector);

-- Index for common filter queries
CREATE INDEX IF NOT EXISTS idx_warts_listed ON warts (listed) WHERE listed = true;
CREATE INDEX IF NOT EXISTS idx_warts_creator ON warts (creator);
CREATE INDEX IF NOT EXISTS idx_warts_media_type ON warts (media_type);
CREATE INDEX IF NOT EXISTS idx_warts_price ON warts (price) WHERE price IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warts_created_at ON warts (created_at DESC);
