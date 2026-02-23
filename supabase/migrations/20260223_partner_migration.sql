-- Partner Migration Setup
-- Adds columns to link old partners to new obrtnik_profiles system

ALTER TABLE public.partners 
ADD COLUMN IF NOT EXISTS new_profile_id uuid 
  REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS migrated_at timestamptz;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_partners_new_profile_id ON public.partners(new_profile_id);
CREATE INDEX IF NOT EXISTS idx_partners_migrated_at ON public.partners(migrated_at);

-- View combining old and new system obrtniki
CREATE OR REPLACE VIEW public.all_obrtniki AS
  -- New system obrtniki
  SELECT 
    op.id,
    p.full_name as name,
    op.business_name,
    p.email,
    op.avg_rating as rating,
    op.is_verified as verified,
    p.location_city as city,
    'new' as system,
    op.created_at
  FROM public.profiles op
  JOIN public.auth.users p ON p.id = op.id
  WHERE op.is_verified = true
  
  UNION ALL
  
  -- Old system partners (not yet migrated)
  SELECT
    pa.id::uuid,
    pa.business_name as name,
    pa.business_name,
    pa.email,
    pa.rating,
    pa.is_verified as verified,
    pa.city,
    'legacy' as system,
    pa.created_at
  FROM public.partners pa
  WHERE pa.is_active = true
  AND pa.new_profile_id IS NULL;
