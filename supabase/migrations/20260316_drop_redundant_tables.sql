-- Migration: Drop empty redundant tables
--
-- obrtnik_reviews  — 0 rows, duplicates ocene (which has richer schema)
--                    ocene is SSOT for craftsman reviews
--
-- partner_paketi   — 0 rows, references old `obrtniki` table
--                    obrtnik_profiles.subscription_tier is SSOT
--
-- NOTE: partners, zaposleni, data_records, service_requests are NOT dropped here
-- because they are still actively referenced by app routes and admin tooling.
-- Their consolidation into the new schema is a separate, code-level migration task.

DROP TABLE IF EXISTS public.obrtnik_reviews;
DROP TABLE IF EXISTS public.partner_paketi;
