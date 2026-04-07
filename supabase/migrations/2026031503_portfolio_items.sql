-- Portfolio items for craftsmen
-- Stores past projects with images, descriptions, and display settings

CREATE TABLE IF NOT EXISTS portfolio_items (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  obrtnik_id    UUID        NOT NULL REFERENCES obrtnik_profiles(id) ON DELETE CASCADE,
  title         TEXT        NOT NULL,
  description   TEXT,
  category      TEXT,
  completed_at  DATE,
  duration_days INTEGER,
  price_approx  NUMERIC(10,2),
  location_city TEXT,
  image_urls    TEXT[]      NOT NULL DEFAULT '{}',
  is_featured   BOOLEAN     NOT NULL DEFAULT false,
  sort_order    INTEGER     NOT NULL DEFAULT 999,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_obrtnik_id
  ON portfolio_items (obrtnik_id);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_featured
  ON portfolio_items (obrtnik_id, is_featured)
  WHERE is_featured = true;

-- RLS: craftsman can manage own items; public can read
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portfolio_items_public_read"
  ON portfolio_items FOR SELECT
  USING (true);

CREATE POLICY "portfolio_items_own_write"
  ON portfolio_items FOR ALL
  USING (
    obrtnik_id IN (
      SELECT id FROM obrtnik_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    obrtnik_id IN (
      SELECT id FROM obrtnik_profiles WHERE user_id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_portfolio_item_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_portfolio_items_updated_at
  BEFORE UPDATE ON portfolio_items
  FOR EACH ROW EXECUTE FUNCTION update_portfolio_item_timestamp();
