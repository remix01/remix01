-- Fix 1: Make category_id nullable in povprasevanja
-- Reason: 18 existing inquiries were created manually before the category fix
-- and have NULL category_id. New inquiries from the form will always have category_id.
ALTER TABLE public.povprasevanja
  ALTER COLUMN category_id DROP NOT NULL;

-- Fix 2: Ensure the index still works for non-null values
-- (existing index idx_povprasevanja_category remains valid for nullable columns)

-- Note: Stripe webhook configuration is manual (Stripe Dashboard → https://liftgo.net/api/webhooks/stripe)
-- Note: Craftsman profiles (tagline, hourly rate, portfolio) are filled in by craftsmen themselves
