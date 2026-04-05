-- Migration: Add missing columns to obrtnik_profiles table
-- Purpose: Fix 'record "new" has no field "updated_at"' error and add contractor profile fields
-- Date: 2026-04-05

-- ============================================================================
-- ADD MISSING TIMESTAMP COLUMN TO obrtnik_profiles
-- ============================================================================
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- ============================================================================
-- ADD CONTRACTOR-SPECIFIC PROFILE FIELDS
-- ============================================================================
-- Professional/service description
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Pricing information
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(10, 2) CHECK (hourly_rate > 0);

-- Experience information
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS years_experience INTEGER CHECK (years_experience >= 0);
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS working_since TEXT;

-- Contact information
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- Online presence / social media
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS facebook_url TEXT;
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS instagram_url TEXT;

-- ============================================================================
-- CREATE OR REPLACE TRIGGER FUNCTION FOR updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_obrtnik_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE TRIGGER ON obrtnik_profiles FOR AUTOMATIC updated_at UPDATE
-- ============================================================================
-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS obrtnik_profiles_updated_at ON public.obrtnik_profiles;

-- Create the new trigger
CREATE TRIGGER obrtnik_profiles_updated_at
BEFORE UPDATE ON public.obrtnik_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_obrtnik_profiles_updated_at();

-- ============================================================================
-- ADD INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_updated_at ON public.obrtnik_profiles(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_hourly_rate ON public.obrtnik_profiles(hourly_rate);
CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_years_experience ON public.obrtnik_profiles(years_experience);
