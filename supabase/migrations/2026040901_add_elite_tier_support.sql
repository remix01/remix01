-- Add ELITE tier support to obrtnik_profiles
-- Date: April 9, 2026
-- Description: Update tier constraints to include ELITE and ENTERPRISE tiers

-- Update subscription_tier constraint
ALTER TABLE public.obrtnik_profiles
  DROP CONSTRAINT IF EXISTS obrtnik_profiles_subscription_tier_check,
  ADD CONSTRAINT obrtnik_profiles_subscription_tier_check
    CHECK (subscription_tier IN ('start', 'pro', 'elite', 'enterprise'));

-- Update plan_type constraint
ALTER TABLE public.obrtnik_profiles
  DROP CONSTRAINT IF EXISTS obrtnik_profiles_plan_type_check,
  ADD CONSTRAINT obrtnik_profiles_plan_type_check
    CHECK (plan_type IN ('START', 'PRO', 'ELITE', 'ENTERPRISE'));

-- Ensure RLS policies are in place for the new tiers (they already apply to all values)
-- No additional RLS changes needed as existing policies work for any tier value
