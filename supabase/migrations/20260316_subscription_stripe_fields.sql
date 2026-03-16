-- Migration: Add subscription tier and Stripe customer fields
-- profiles: stripe_customer_id + subscription_tier
-- obrtnik_profiles: stripe_customer_id + stripe_subscription_id + subscription_tier

-- profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS subscription_tier  text NOT NULL DEFAULT 'start'
    CHECK (subscription_tier IN ('start', 'pro', 'plus'));

-- obrtnik_profiles table
ALTER TABLE public.obrtnik_profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id    text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS subscription_tier      text NOT NULL DEFAULT 'start'
    CHECK (subscription_tier IN ('start', 'pro', 'plus'));

-- Indexes for webhook lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id
  ON public.profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_stripe_customer_id
  ON public.obrtnik_profiles(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;
