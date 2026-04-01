-- Partner Migration Setup
-- Adds columns to link old partners to new obrtnik_profiles system
-- NOTE: All statements guarded — public.partners is not created in any migration.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'partners'
  ) THEN
    RETURN;
  END IF;

  ALTER TABLE public.partners
    ADD COLUMN IF NOT EXISTS new_profile_id uuid
      REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS migrated_at timestamptz;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_partners_new_profile_id') THEN
    CREATE INDEX idx_partners_new_profile_id ON public.partners(new_profile_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_partners_migrated_at') THEN
    CREATE INDEX idx_partners_migrated_at ON public.partners(migrated_at);
  END IF;
END $$;

-- View combining old and new system obrtniki (only created if partners exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'partners'
  ) THEN
    RETURN;
  END IF;

  EXECUTE $q$
    CREATE OR REPLACE VIEW public.all_obrtniki AS
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
      FROM public.obrtnik_profiles op
      JOIN public.profiles p ON p.id = op.id
      WHERE op.is_verified = true
      UNION ALL
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
      AND pa.new_profile_id IS NULL
  $q$;
END $$;
