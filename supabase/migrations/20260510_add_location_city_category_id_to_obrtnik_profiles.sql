-- Add missing columns to obrtnik_profiles required for lead management
ALTER TABLE public.obrtnik_profiles
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_location_city ON public.obrtnik_profiles(location_city);
CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_category_id ON public.obrtnik_profiles(category_id);

-- Backfill location_city from linked profiles rows
UPDATE public.obrtnik_profiles op
SET location_city = p.location_city
FROM public.profiles p
WHERE op.id = p.id
  AND p.location_city IS NOT NULL
  AND op.location_city IS NULL;
