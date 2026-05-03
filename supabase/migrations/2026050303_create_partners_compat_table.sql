-- Compatibility table for legacy migrations that reference public.partners.
-- Keeps schema bootstraps from failing while current app code uses obrtnik_profiles.
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

