-- Track Stripe Connect account lifecycle status for obrtnik (craftsman) profiles.
-- Values mirror the partner table: 'incomplete' | 'pending' | 'active'
ALTER TABLE public.obrtnik_profiles
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'incomplete';
