-- =============================================================================
-- Migration: 20260330_skills_support
-- Description: Adds service_areas and categories support for the Skills System
-- Author: LiftGO Skills PoC
-- Date: 2026-03-30
--
-- TERMINOLOGY MAP (same concept, multiple names in this codebase):
--   Craftsman  = obrtnik = mojster = partner = craftworker
--   Customer   = naročnik = stranka
--   Request    = povpraševanje = inquiry = job
--
-- TABLE AUTHORITY (which table owns what data):
--   PRIMARY  → obrtnik_profiles       (main craftsman table, most code uses this)
--   SECONDARY→ craftworker_profile    (newer schema, used by skills system)
--   PRIMARY  → povprasevanja          (main job/request table, Slovenian flow)
--   SECONDARY→ job                    (newer schema, English flow)
--   CATEGORIES → categories           (already exists, shared by both schemas)
-- =============================================================================

-- =============================================================================
-- STEP 1: Add service_areas array to obrtnik_profiles (PRIMARY craftsman table)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'obrtnik_profiles'
      AND column_name  = 'service_areas'
  ) THEN
    ALTER TABLE public.obrtnik_profiles
      ADD COLUMN service_areas TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added service_areas to obrtnik_profiles';
  ELSE
    RAISE NOTICE 'service_areas already exists in obrtnik_profiles';
  END IF;
END $$;

-- =============================================================================
-- STEP 2: Add service_areas + categories arrays to craftworker_profile
--         (SECONDARY craftsman table used by newer skills)
-- =============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'craftworker_profile'
      AND column_name  = 'service_areas'
  ) THEN
    ALTER TABLE public.craftworker_profile
      ADD COLUMN service_areas TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added service_areas to craftworker_profile';
  ELSE
    RAISE NOTICE 'service_areas already exists in craftworker_profile';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'craftworker_profile'
      AND column_name  = 'categories'
  ) THEN
    ALTER TABLE public.craftworker_profile
      ADD COLUMN categories TEXT[] DEFAULT '{}';
    RAISE NOTICE 'Added categories to craftworker_profile';
  ELSE
    RAISE NOTICE 'categories already exists in craftworker_profile';
  END IF;
END $$;

-- =============================================================================
-- STEP 3: Extend existing categories table
--         (categories table already exists from 004_liftgo_marketplace.sql)
--         Add description_sl, icon, active if missing (name may differ)
-- =============================================================================
DO $$
BEGIN
  -- Add description column if it doesn't exist (table uses 'description' already)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'categories'
      AND column_name  = 'description_sl'
  ) THEN
    ALTER TABLE public.categories ADD COLUMN description_sl TEXT;
    RAISE NOTICE 'Added description_sl to categories';
  END IF;
END $$;

-- Seed / upsert Slovenian categories aligned with pricing-rules.ts slugs
INSERT INTO public.categories (slug, name, icon_name, description, description_sl, is_active, sort_order) VALUES
  ('vodovodna-dela',   'Vodovodne storitve',    'droplet',    'Plumbing services',         'Popravila vodovodnih inštalacij, cevi, pip',   true,  1),
  ('elektrika',        'Električne storitve',   'zap',        'Electrical services',       'Električne inštalacije, popravila, montaža',   true,  2),
  ('slikopleskarstvo', 'Slikopleskarstvo',       'paint-2',    'Painting & Plastering',     'Barvanje, tapetiranje, ometavanje',            true,  3),
  ('tesarstvo',        'Mizarstvo in tesarstvo','hammer',      'Carpentry & Joinery',       'Izdelava pohištva, montaža, popravila lesa',   true,  4),
  ('ogrevanje-klima',  'Ogrevanje in klima',    'thermometer','Heating & AC',              'Instalacija, servis klimatskih naprav',        true,  5),
  ('selitev',          'Selitve',               'truck',      'Moving',                    'Selitve, prevoz pohištva',                     true,  6),
  ('ciscenje',         'Čiščenje',              'sparkles',   'Cleaning',                  'Generalno čiščenje, čistilni servisi',         true,  7),
  ('stresna-dela',     'Krovska dela',          'home',       'Roofing',                   'Kritina, obnova streh, žlebovi',               true,  8),
  ('keramika',         'Keramika in tlaki',     'grid-3x3',   'Tiling & Flooring',         'Polaganje ploščic, keramike, parketa',         true,  9),
  ('splosno-vzdrz',    'Splošno vzdrževanje',   'wrench',     'General Maintenance',       'Splošna hišna popravila in vzdrževanje',       true, 10)
ON CONFLICT (slug) DO UPDATE SET
  name         = EXCLUDED.name,
  icon_name    = EXCLUDED.icon_name,
  description  = EXCLUDED.description,
  description_sl = EXCLUDED.description_sl,
  is_active    = EXCLUDED.is_active,
  sort_order   = EXCLUDED.sort_order;

-- =============================================================================
-- STEP 4: obrtnik_service_areas junction table
--         (obrtnik_categories already exists — mirrors it for locations)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.obrtnik_service_areas (
  obrtnik_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  city       TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (obrtnik_id, city)
);

CREATE INDEX IF NOT EXISTS idx_obrtnik_service_areas_obrtnik ON public.obrtnik_service_areas(obrtnik_id);
CREATE INDEX IF NOT EXISTS idx_obrtnik_service_areas_city    ON public.obrtnik_service_areas(city);

ALTER TABLE public.obrtnik_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "obrtnik_areas_select_all"
  ON public.obrtnik_service_areas FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "obrtnik_areas_manage_own"
  ON public.obrtnik_service_areas FOR ALL TO authenticated
  USING (auth.uid() = obrtnik_id)
  WITH CHECK (auth.uid() = obrtnik_id);

-- =============================================================================
-- STEP 5: craftworker junction tables
--         (NEW schema — craftworker_profile is secondary/English schema)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.craftworker_categories (
  craftworker_id UUID NOT NULL REFERENCES public.craftworker_profile(id) ON DELETE CASCADE,
  category_slug  TEXT NOT NULL REFERENCES public.categories(slug) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (craftworker_id, category_slug)
);

CREATE INDEX IF NOT EXISTS idx_craftworker_categories_craftworker
  ON public.craftworker_categories(craftworker_id);

ALTER TABLE public.craftworker_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "craftworker_categories_select_all"
  ON public.craftworker_categories FOR SELECT USING (true);

-- NOTE: craftworker_id is NOT auth.uid() — must resolve via user_id
CREATE POLICY IF NOT EXISTS "craftworker_categories_manage_own_or_admin"
  ON public.craftworker_categories FOR ALL TO authenticated
  USING (
    (SELECT user_id FROM public.craftworker_profile WHERE id = craftworker_id) = auth.uid()
    OR (SELECT role FROM public."user" WHERE id = auth.uid()) = 'ADMIN'
  );

CREATE TABLE IF NOT EXISTS public.craftworker_service_areas (
  craftworker_id UUID NOT NULL REFERENCES public.craftworker_profile(id) ON DELETE CASCADE,
  city           TEXT NOT NULL,
  is_primary     BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (craftworker_id, city)
);

CREATE INDEX IF NOT EXISTS idx_craftworker_service_areas_craftworker
  ON public.craftworker_service_areas(craftworker_id);
CREATE INDEX IF NOT EXISTS idx_craftworker_service_areas_city
  ON public.craftworker_service_areas(city);

ALTER TABLE public.craftworker_service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "craftworker_areas_select_all"
  ON public.craftworker_service_areas FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "craftworker_areas_manage_own_or_admin"
  ON public.craftworker_service_areas FOR ALL TO authenticated
  USING (
    (SELECT user_id FROM public.craftworker_profile WHERE id = craftworker_id) = auth.uid()
    OR (SELECT role FROM public."user" WHERE id = auth.uid()) = 'ADMIN'
  );

-- =============================================================================
-- STEP 6: Sync function — junction tables → arrays
--         Handles BOTH obrtnik_profiles (Slovenian) and craftworker_profile (English)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.sync_obrtnik_arrays()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target_id UUID := COALESCE(NEW.obrtnik_id, OLD.obrtnik_id);
BEGIN
  IF target_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  -- Sync categories via obrtnik_categories (slug from categories.slug)
  UPDATE public.obrtnik_profiles
  SET categories = COALESCE((
    SELECT array_agg(c.slug ORDER BY c.slug)
    FROM public.obrtnik_categories oc
    JOIN public.categories c ON c.id = oc.category_id
    WHERE oc.obrtnik_id = target_id
  ), '{}')
  WHERE id = target_id;

  -- Sync service_areas
  UPDATE public.obrtnik_profiles
  SET service_areas = COALESCE((
    SELECT array_agg(city ORDER BY city)
    FROM public.obrtnik_service_areas
    WHERE obrtnik_id = target_id
  ), '{}')
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_craftworker_arrays()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  target_id UUID := COALESCE(NEW.craftworker_id, OLD.craftworker_id);
BEGIN
  IF target_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  UPDATE public.craftworker_profile
  SET categories = COALESCE((
    SELECT array_agg(category_slug ORDER BY category_slug)
    FROM public.craftworker_categories
    WHERE craftworker_id = target_id
  ), '{}'),
  service_areas = COALESCE((
    SELECT array_agg(city ORDER BY city)
    FROM public.craftworker_service_areas
    WHERE craftworker_id = target_id
  ), '{}')
  WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- =============================================================================
-- STEP 7: Triggers
-- =============================================================================
-- Slovenian schema (obrtnik_profiles)
DROP TRIGGER IF EXISTS trg_sync_obrtnik_categories   ON public.obrtnik_categories;
DROP TRIGGER IF EXISTS trg_sync_obrtnik_service_areas ON public.obrtnik_service_areas;

CREATE TRIGGER trg_sync_obrtnik_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.obrtnik_categories
  FOR EACH ROW EXECUTE FUNCTION public.sync_obrtnik_arrays();

CREATE TRIGGER trg_sync_obrtnik_service_areas
  AFTER INSERT OR UPDATE OR DELETE ON public.obrtnik_service_areas
  FOR EACH ROW EXECUTE FUNCTION public.sync_obrtnik_arrays();

-- English schema (craftworker_profile)
DROP TRIGGER IF EXISTS trg_sync_craftworker_categories   ON public.craftworker_categories;
DROP TRIGGER IF EXISTS trg_sync_craftworker_service_areas ON public.craftworker_service_areas;

CREATE TRIGGER trg_sync_craftworker_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.craftworker_categories
  FOR EACH ROW EXECUTE FUNCTION public.sync_craftworker_arrays();

CREATE TRIGGER trg_sync_craftworker_service_areas
  AFTER INSERT OR UPDATE OR DELETE ON public.craftworker_service_areas
  FOR EACH ROW EXECUTE FUNCTION public.sync_craftworker_arrays();

-- =============================================================================
-- STEP 8: GIN indexes for fast @> array queries
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_categories
  ON public.obrtnik_profiles USING GIN (categories);

CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_service_areas
  ON public.obrtnik_profiles USING GIN (service_areas);

CREATE INDEX IF NOT EXISTS idx_craftworker_profile_categories
  ON public.craftworker_profile USING GIN (categories);

CREATE INDEX IF NOT EXISTS idx_craftworker_profile_service_areas
  ON public.craftworker_profile USING GIN (service_areas);

-- =============================================================================
-- VERIFICATION
-- =============================================================================
SELECT 'obrtnik_profiles columns' AS check,
       column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'obrtnik_profiles'
  AND column_name  IN ('service_areas', 'categories');

SELECT 'craftworker_profile columns' AS check,
       column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   = 'craftworker_profile'
  AND column_name  IN ('service_areas', 'categories');

SELECT 'categories count' AS check, COUNT(*) FROM public.categories;

SELECT 'indexes' AS check, indexname, tablename
FROM pg_indexes
WHERE tablename IN (
  'obrtnik_profiles','obrtnik_service_areas',
  'craftworker_profile','craftworker_categories','craftworker_service_areas'
)
AND indexname LIKE 'idx_%';

-- =============================================================================
-- ROLLBACK
-- =============================================================================
/*
DROP TRIGGER IF EXISTS trg_sync_obrtnik_categories    ON public.obrtnik_categories;
DROP TRIGGER IF EXISTS trg_sync_obrtnik_service_areas  ON public.obrtnik_service_areas;
DROP TRIGGER IF EXISTS trg_sync_craftworker_categories ON public.craftworker_categories;
DROP TRIGGER IF EXISTS trg_sync_craftworker_service_areas ON public.craftworker_service_areas;
DROP FUNCTION IF EXISTS public.sync_obrtnik_arrays();
DROP FUNCTION IF EXISTS public.sync_craftworker_arrays();
DROP TABLE IF EXISTS public.craftworker_service_areas CASCADE;
DROP TABLE IF EXISTS public.craftworker_categories CASCADE;
DROP TABLE IF EXISTS public.obrtnik_service_areas CASCADE;
ALTER TABLE public.obrtnik_profiles    DROP COLUMN IF EXISTS service_areas;
ALTER TABLE public.obrtnik_profiles    DROP COLUMN IF EXISTS categories;
ALTER TABLE public.craftworker_profile DROP COLUMN IF EXISTS service_areas;
ALTER TABLE public.craftworker_profile DROP COLUMN IF EXISTS categories;
*/
