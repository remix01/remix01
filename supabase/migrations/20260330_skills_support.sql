-- =============================================================================
-- Migration: 20260330_skills_support
--
-- Adds schema support for the LiftGO Skills System:
--   1. service_areas[] and categories[] arrays on craftworker_profile (fast filter)
--   2. service_categories lookup table
--   3. craftworker_categories  junction table (admin management)
--   4. craftworker_service_areas junction table (admin management)
--   5. Sync triggers: junction tables → arrays (Option C Hybrid)
--   6. GIN indexes for fast array queries
--   7. Slovenian category seed data
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add array columns to craftworker_profile
-- ---------------------------------------------------------------------------
ALTER TABLE public.craftworker_profile
  ADD COLUMN IF NOT EXISTS service_areas TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS categories    TEXT[] DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 2. Service categories lookup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug       TEXT NOT NULL UNIQUE,
  name_sl    TEXT NOT NULL,
  name_en    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_categories_select_all" ON public.service_categories
  FOR SELECT USING (true);

CREATE POLICY "service_categories_admin_write" ON public.service_categories
  FOR ALL USING ((SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN');

-- Seed Slovenian service categories (aligned with pricing-rules.ts slugs)
INSERT INTO public.service_categories (slug, name_sl, name_en) VALUES
  ('vodovodna-dela',     'Vodovodne storitve',    'Plumbing'),
  ('elektrika',          'Električne storitve',   'Electrical'),
  ('slikopleskarstvo',   'Slikopleskarstvo',      'Painting & Plastering'),
  ('tesarstvo',          'Mizarstvo in tesarstvo','Carpentry & Joinery'),
  ('ogrevanje-klima',    'Ogrevanje in klima',    'Heating & AC'),
  ('selitev',            'Selitve',               'Moving'),
  ('ciscenje',           'Čiščenje',              'Cleaning'),
  ('stresna-dela',       'Krovska dela',          'Roofing'),
  ('keramika',           'Keramika in tlaki',     'Tiling & Flooring'),
  ('splosno-vzdrz',      'Splošno vzdrževanje',   'General Maintenance')
ON CONFLICT (slug) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Craftworker ↔ Categories junction
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.craftworker_categories (
  craftworker_id UUID NOT NULL REFERENCES public.craftworker_profile(id) ON DELETE CASCADE,
  category_slug  TEXT NOT NULL REFERENCES public.service_categories(slug) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (craftworker_id, category_slug)
);

CREATE INDEX IF NOT EXISTS idx_craftworker_categories_craftworker
  ON public.craftworker_categories(craftworker_id);

ALTER TABLE public.craftworker_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "craftworker_categories_select_all" ON public.craftworker_categories
  FOR SELECT USING (true);

CREATE POLICY "craftworker_categories_manage_own_or_admin" ON public.craftworker_categories
  FOR ALL USING (
    (SELECT user_id FROM public.craftworker_profile WHERE id = craftworker_id) = auth.uid()
    OR (SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN'
  );

-- ---------------------------------------------------------------------------
-- 4. Craftworker ↔ Service areas junction
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.craftworker_service_areas (
  craftworker_id UUID NOT NULL REFERENCES public.craftworker_profile(id) ON DELETE CASCADE,
  city           TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (craftworker_id, city)
);

CREATE INDEX IF NOT EXISTS idx_craftworker_service_areas_craftworker
  ON public.craftworker_service_areas(craftworker_id);

ALTER TABLE public.craftworker_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "craftworker_service_areas_select_all" ON public.craftworker_service_areas
  FOR SELECT USING (true);

CREATE POLICY "craftworker_service_areas_manage_own_or_admin" ON public.craftworker_service_areas
  FOR ALL USING (
    (SELECT user_id FROM public.craftworker_profile WHERE id = craftworker_id) = auth.uid()
    OR (SELECT role FROM public.user WHERE id = auth.uid()) = 'ADMIN'
  );

-- ---------------------------------------------------------------------------
-- 5. Sync trigger: keep arrays in sync with junction tables
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_craftworker_arrays()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  cw_id UUID := COALESCE(NEW.craftworker_id, OLD.craftworker_id);
BEGIN
  UPDATE public.craftworker_profile
  SET
    categories = COALESCE((
      SELECT array_agg(category_slug ORDER BY category_slug)
      FROM public.craftworker_categories
      WHERE craftworker_id = cw_id
    ), '{}'),
    service_areas = COALESCE((
      SELECT array_agg(city ORDER BY city)
      FROM public.craftworker_service_areas
      WHERE craftworker_id = cw_id
    ), '{}')
  WHERE id = cw_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_craftworker_categories  ON public.craftworker_categories;
DROP TRIGGER IF EXISTS trg_sync_craftworker_service_areas ON public.craftworker_service_areas;

CREATE TRIGGER trg_sync_craftworker_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.craftworker_categories
  FOR EACH ROW EXECUTE FUNCTION public.sync_craftworker_arrays();

CREATE TRIGGER trg_sync_craftworker_service_areas
  AFTER INSERT OR UPDATE OR DELETE ON public.craftworker_service_areas
  FOR EACH ROW EXECUTE FUNCTION public.sync_craftworker_arrays();

-- ---------------------------------------------------------------------------
-- 6. GIN indexes on craftworker_profile arrays (fast @> queries)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_craftworker_profile_categories
  ON public.craftworker_profile USING GIN (categories);

CREATE INDEX IF NOT EXISTS idx_craftworker_profile_service_areas
  ON public.craftworker_profile USING GIN (service_areas);
