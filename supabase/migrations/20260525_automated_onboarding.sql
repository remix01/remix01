-- Automated Onboarding Architecture
-- Supply Pipeline: craftsman discovery, prospects, verification
-- Demand Pipeline: task drafts, lead capture, SEO cache
-- Feedback loop: supply/demand signals

-- ─────────────────────────────────────────
-- COUNTRIES
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  code        TEXT PRIMARY KEY,                  -- ISO 3166-1 alpha-2 (SI, DE, HR, AT)
  name        TEXT NOT NULL,
  name_local  TEXT NOT NULL,                     -- native language name
  locale      TEXT NOT NULL DEFAULT 'sl',        -- BCP 47 locale
  currency    TEXT NOT NULL DEFAULT 'EUR',
  timezone    TEXT NOT NULL DEFAULT 'Europe/Ljubljana',
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  launched_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO countries (code, name, name_local, locale, currency, timezone, is_active, launched_at) VALUES
  ('SI', 'Slovenia',       'Slovenija',  'sl',    'EUR', 'Europe/Ljubljana', TRUE,  NOW()),
  ('HR', 'Croatia',        'Hrvatska',   'hr',    'EUR', 'Europe/Zagreb',    FALSE, NULL),
  ('AT', 'Austria',        'Österreich', 'de-AT', 'EUR', 'Europe/Vienna',    FALSE, NULL),
  ('DE', 'Germany',        'Deutschland','de',    'EUR', 'Europe/Berlin',    FALSE, NULL)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────
-- LOCATIONS (cities per country)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS locations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code TEXT NOT NULL REFERENCES countries(code),
  name         TEXT NOT NULL,
  name_local   TEXT NOT NULL,
  lat          NUMERIC(10, 7) NOT NULL,
  lng          NUMERIC(10, 7) NOT NULL,
  population   INTEGER,
  priority     INTEGER NOT NULL DEFAULT 0,   -- higher = discover first
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, name)
);

-- Slovenia: 15 cities (by population priority)
INSERT INTO locations (country_code, name, name_local, lat, lng, population, priority) VALUES
  ('SI', 'Ljubljana',  'Ljubljana',  46.0569,  14.5058,  295000, 100),
  ('SI', 'Maribor',    'Maribor',    46.5547,  15.6467,  112000, 90),
  ('SI', 'Celje',      'Celje',      46.2317,  15.2681,  50000,  80),
  ('SI', 'Kranj',      'Kranj',      46.2392,  14.3556,  55000,  75),
  ('SI', 'Velenje',    'Velenje',    46.3592,  15.1108,  33000,  65),
  ('SI', 'Koper',      'Koper',      45.5483,  13.7300,  52000,  70),
  ('SI', 'Novo Mesto', 'Novo Mesto', 45.8019,  15.1703,  41000,  65),
  ('SI', 'Ptuj',       'Ptuj',       46.4200,  15.8697,  23000,  55),
  ('SI', 'Trbovlje',   'Trbovlje',   46.1531,  15.0500,  16000,  45),
  ('SI', 'Kamnik',     'Kamnik',     46.2256,  14.6108,  29000,  50),
  ('SI', 'Škofja Loka','Škofja Loka',46.1658,  14.3075,  22000,  45),
  ('SI', 'Murska Sobota','Murska Sobota',46.6625,16.1647,13000,  40),
  ('SI', 'Nova Gorica','Nova Gorica', 45.9574,  13.6525,  32000,  60),
  ('SI', 'Domžale',    'Domžale',    46.1406,  14.5950,  35000,  55),
  ('SI', 'Jesenice',   'Jesenice',   46.4369,  14.0503,  21000,  40)
ON CONFLICT (country_code, name) DO NOTHING;

-- ─────────────────────────────────────────
-- CRAFTSMAN PROSPECTS
-- Discovered but not yet registered craftsmen
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS craftsman_prospects (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code     TEXT NOT NULL REFERENCES countries(code),
  location_id      UUID REFERENCES locations(id),
  city             TEXT NOT NULL,
  business_name    TEXT NOT NULL,
  contact_name     TEXT,
  email            TEXT,
  phone            TEXT,
  website          TEXT,
  google_place_id  TEXT UNIQUE,
  google_rating    NUMERIC(3,2),
  google_reviews   INTEGER DEFAULT 0,
  categories       TEXT[] NOT NULL DEFAULT '{}',
  source           TEXT NOT NULL DEFAULT 'google_maps',  -- google_maps | manual | referral
  status           TEXT NOT NULL DEFAULT 'discovered',
  -- Status: discovered → invited → registered → verified | rejected
  invited_at       TIMESTAMPTZ,
  invite_token     TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  registered_at    TIMESTAMPTZ,
  obrtnik_id       UUID,  -- FK to obrtnik_profiles once registered
  rejection_reason TEXT,
  ai_quality_score INTEGER CHECK (ai_quality_score BETWEEN 0 AND 100),
  raw_data         JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prospects_status      ON craftsman_prospects(status);
CREATE INDEX IF NOT EXISTS idx_prospects_country     ON craftsman_prospects(country_code);
CREATE INDEX IF NOT EXISTS idx_prospects_location    ON craftsman_prospects(location_id);
CREATE INDEX IF NOT EXISTS idx_prospects_categories  ON craftsman_prospects USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_prospects_invite_token ON craftsman_prospects(invite_token);

-- ─────────────────────────────────────────
-- TASK DRAFTS
-- Visitor chatbot captures leads before registration
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_drafts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    TEXT NOT NULL,
  user_id       UUID,                         -- set after registration
  category      TEXT,
  city          TEXT,
  country_code  TEXT REFERENCES countries(code) DEFAULT 'SI',
  urgency       INTEGER CHECK (urgency BETWEEN 1 AND 3) DEFAULT 2,
  description   TEXT,
  budget_range  TEXT,
  email         TEXT,
  phone         TEXT,
  source        TEXT NOT NULL DEFAULT 'chatbot',   -- chatbot | landing | ads
  utm_source    TEXT,
  utm_medium    TEXT,
  utm_campaign  TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',    -- draft | converted | expired
  converted_task_id UUID,
  converted_at  TIMESTAMPTZ,
  expires_at    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_drafts_session   ON task_drafts(session_id);
CREATE INDEX IF NOT EXISTS idx_task_drafts_email     ON task_drafts(email);
CREATE INDEX IF NOT EXISTS idx_task_drafts_status    ON task_drafts(status);
CREATE INDEX IF NOT EXISTS idx_task_drafts_expires   ON task_drafts(expires_at) WHERE status = 'draft';

-- ─────────────────────────────────────────
-- SEO CONTENT CACHE
-- AI-generated pages per country/city/category
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seo_content_cache (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code   TEXT NOT NULL REFERENCES countries(code),
  city           TEXT NOT NULL,
  category_slug  TEXT NOT NULL,
  locale         TEXT NOT NULL DEFAULT 'sl',
  title          TEXT NOT NULL,
  meta_desc      TEXT NOT NULL,
  h1             TEXT NOT NULL,
  content_html   TEXT NOT NULL,
  schema_json    JSONB DEFAULT '{}',
  generated_by   TEXT DEFAULT 'claude-sonnet-4-6',
  generated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  view_count     INTEGER DEFAULT 0,
  UNIQUE (country_code, city, category_slug, locale)
);

CREATE INDEX IF NOT EXISTS idx_seo_cache_lookup
  ON seo_content_cache(country_code, city, category_slug, locale);
CREATE INDEX IF NOT EXISTS idx_seo_cache_expires
  ON seo_content_cache(expires_at);

-- ─────────────────────────────────────────
-- SUPPLY/DEMAND SIGNALS
-- Powers the feedback loop between both pipelines
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supply_demand_signals (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code    TEXT NOT NULL REFERENCES countries(code),
  city            TEXT NOT NULL,
  category        TEXT NOT NULL,
  open_tasks      INTEGER NOT NULL DEFAULT 0,
  active_craftsmen INTEGER NOT NULL DEFAULT 0,
  avg_response_h  NUMERIC(6,2),               -- avg hours until first ponudba
  demand_score    INTEGER CHECK (demand_score BETWEEN 0 AND 100),
  supply_score    INTEGER CHECK (supply_score BETWEEN 0 AND 100),
  imbalance       TEXT GENERATED ALWAYS AS (
    CASE
      WHEN open_tasks = 0 AND active_craftsmen = 0 THEN 'neutral'
      WHEN active_craftsmen = 0 THEN 'no_supply'
      WHEN open_tasks = 0 THEN 'no_demand'
      WHEN (open_tasks::FLOAT / GREATEST(active_craftsmen, 1)) > 3 THEN 'supply_needed'
      WHEN (open_tasks::FLOAT / GREATEST(active_craftsmen, 1)) < 0.3 THEN 'demand_needed'
      ELSE 'balanced'
    END
  ) STORED,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (country_code, city, category, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_signals_lookup
  ON supply_demand_signals(country_code, city, category, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_signals_imbalance
  ON supply_demand_signals(imbalance, recorded_at DESC);

-- ─────────────────────────────────────────
-- VERIFICATION RECORDS
-- 4-step craftsman verification history
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS craftsman_verification_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obrtnik_id   UUID NOT NULL,
  step         TEXT NOT NULL,  -- identity | license | insurance | references
  status       TEXT NOT NULL,  -- pending | passed | failed | skipped
  result_data  JSONB DEFAULT '{}',
  verified_by  TEXT DEFAULT 'ai',  -- ai | human | stripe_identity
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verif_obrtnik ON craftsman_verification_log(obrtnik_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verif_step    ON craftsman_verification_log(step, status);

-- ─────────────────────────────────────────
-- UPDATED_AT trigger for craftsman_prospects
-- ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_prospects_updated_at ON craftsman_prospects;
CREATE TRIGGER set_prospects_updated_at
  BEFORE UPDATE ON craftsman_prospects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────
ALTER TABLE countries                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_prospects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_drafts                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE seo_content_cache            ENABLE ROW LEVEL SECURITY;
ALTER TABLE supply_demand_signals        ENABLE ROW LEVEL SECURITY;
ALTER TABLE craftsman_verification_log   ENABLE ROW LEVEL SECURITY;

-- Public read for reference tables
CREATE POLICY "public_read_countries"  ON countries         FOR SELECT USING (TRUE);
CREATE POLICY "public_read_locations"  ON locations         FOR SELECT USING (TRUE);
CREATE POLICY "public_read_seo_cache"  ON seo_content_cache FOR SELECT USING (TRUE);

-- Prospects: service_role only
CREATE POLICY "service_role_prospects"
  ON craftsman_prospects USING (auth.role() = 'service_role');

-- Task drafts: owner or service_role
CREATE POLICY "owner_task_drafts"
  ON task_drafts
  USING (
    auth.uid() = user_id
    OR session_id = (current_setting('request.headers', TRUE)::JSONB->>'x-session-id')::TEXT
    OR auth.role() = 'service_role'
  );

-- Signals: service_role write, authenticated read
CREATE POLICY "service_role_signals_write"
  ON supply_demand_signals FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY "authenticated_signals_read"
  ON supply_demand_signals FOR SELECT USING (auth.role() IN ('authenticated', 'service_role'));

-- Verification log: service_role only
CREATE POLICY "service_role_verif_log"
  ON craftsman_verification_log USING (auth.role() = 'service_role');
