-- Partner Migration: cleanup
-- public.partners never existed as a standalone table; obrtnik_profiles IS the canonical table.
-- This migration creates the all_obrtniki view from obrtnik_profiles + profiles only.

CREATE OR REPLACE VIEW public.all_obrtniki AS
  SELECT
    op.id,
    p.full_name  AS name,
    op.business_name,
    p.email,
    op.avg_rating AS rating,
    op.is_verified AS verified,
    p.location_city AS city,
    op.created_at
  FROM public.obrtnik_profiles op
  JOIN public.profiles p ON p.id = op.id
  WHERE op.is_verified = true;
