-- Allow ELITE tier in obrtnik profile subscription checks
ALTER TABLE public.obrtnik_profiles
  DROP CONSTRAINT IF EXISTS obrtnik_profiles_subscription_tier_check;

ALTER TABLE public.obrtnik_profiles
  ADD CONSTRAINT obrtnik_profiles_subscription_tier_check
  CHECK (subscription_tier IN ('start', 'pro', 'elite'));
