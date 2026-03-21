-- Add extended profile fields to obrtnik_profiles
ALTER TABLE public.obrtnik_profiles
  ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'start' CHECK (subscription_tier IN ('start', 'pro')),
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS tagline TEXT,
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS years_experience INTEGER,
  ADD COLUMN IF NOT EXISTS working_since TEXT,
  ADD COLUMN IF NOT EXISTS website_url TEXT,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS certificate_urls TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS service_radius_km INTEGER;

-- Availability schedule for obrtnik
CREATE TABLE IF NOT EXISTS public.obrtnik_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obrtnik_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME,
  end_time TIME,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (obrtnik_id, day_of_week)
);

ALTER TABLE public.obrtnik_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Obrtniki can manage own availability"
  ON public.obrtnik_availability FOR ALL
  TO authenticated
  USING (auth.uid() = obrtnik_id);

CREATE POLICY "Anyone can read availability"
  ON public.obrtnik_availability FOR SELECT
  USING (true);

-- Service areas for obrtnik
CREATE TABLE IF NOT EXISTS public.service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obrtnik_id UUID NOT NULL REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  region TEXT NOT NULL,
  city TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Obrtniki can manage own service areas"
  ON public.service_areas FOR ALL
  TO authenticated
  USING (auth.uid() = obrtnik_id);

CREATE POLICY "Anyone can read service areas"
  ON public.service_areas FOR SELECT
  USING (is_active = true);

CREATE INDEX IF NOT EXISTS idx_obrtnik_availability_obrtnik ON public.obrtnik_availability(obrtnik_id);
CREATE INDEX IF NOT EXISTS idx_service_areas_obrtnik ON public.service_areas(obrtnik_id);
