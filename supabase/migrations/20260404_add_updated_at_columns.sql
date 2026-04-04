-- Add updated_at columns and triggers for timestamp management

-- ============================================================================
-- ADD UPDATED_AT TO PROFILES TABLE
-- ============================================================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill updated_at with created_at value
UPDATE public.profiles SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL;

-- Create trigger function for moddatetime (if not exists)
CREATE OR REPLACE FUNCTION public.moddatetime()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles table
DROP TRIGGER IF EXISTS profiles_moddatetime ON public.profiles;
CREATE TRIGGER profiles_moddatetime
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.moddatetime();

-- ============================================================================
-- ADD UPDATED_AT TO OBRTNIK_PROFILES TABLE
-- ============================================================================
ALTER TABLE public.obrtnik_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Backfill updated_at with created_at value
UPDATE public.obrtnik_profiles SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL;

-- Create trigger for obrtnik_profiles table
DROP TRIGGER IF EXISTS obrtnik_profiles_moddatetime ON public.obrtnik_profiles;
CREATE TRIGGER obrtnik_profiles_moddatetime
  BEFORE UPDATE ON public.obrtnik_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.moddatetime();

-- ============================================================================
-- ENSURE RLS POLICIES FOR PROFILES UPDATE
-- ============================================================================
-- Drop if exists
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- Create update policy
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
