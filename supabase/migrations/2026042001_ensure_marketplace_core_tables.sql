-- Ensure core marketplace tables/columns exist across environments.
-- Safe to run repeatedly in production.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Categories lookup
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_auto_created BOOLEAN NOT NULL DEFAULT false,
  icon_name TEXT,
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 999,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS is_auto_created BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS icon_name TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 999;

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_active ON public.categories(is_active);

-- ---------------------------------------------------------------------------
-- Locations lookup (for canonical location_city normalization)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  region TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_auto_created BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_slug ON public.locations(slug);
CREATE INDEX IF NOT EXISTS idx_locations_active ON public.locations(is_active);

-- ---------------------------------------------------------------------------
-- Povprasevanja (requests): add commonly required columns if missing
-- ---------------------------------------------------------------------------
ALTER TABLE public.povprasevanja
  ADD COLUMN IF NOT EXISTS title TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'odprto',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_povprasevanja_location_city ON public.povprasevanja(location_city);
CREATE INDEX IF NOT EXISTS idx_povprasevanja_category_id ON public.povprasevanja(category_id);

-- ---------------------------------------------------------------------------
-- Ponudbe (offers): add commonly required columns if missing
-- ---------------------------------------------------------------------------
ALTER TABLE public.ponudbe
  ADD COLUMN IF NOT EXISTS povprasevanje_id UUID,
  ADD COLUMN IF NOT EXISTS obrtnik_id UUID,
  ADD COLUMN IF NOT EXISTS message TEXT,
  ADD COLUMN IF NOT EXISTS price_estimate NUMERIC,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'poslana',
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_ponudbe_povprasevanje ON public.ponudbe(povprasevanje_id);
CREATE INDEX IF NOT EXISTS idx_ponudbe_obrtnik ON public.ponudbe(obrtnik_id);

