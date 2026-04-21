-- Fix Supabase Performance Advisor warnings for duplicate/redundant indexes.
-- These indexes are redundant because equivalent unique indexes/constraints already exist.

-- categories.slug already has a UNIQUE constraint-backed index.
DROP INDEX IF EXISTS public.idx_categories_slug;

-- locations.slug already has a UNIQUE constraint-backed index.
DROP INDEX IF EXISTS public.idx_locations_slug;

-- idx_categories_slug_unique_active already covers (slug) WHERE is_active = true.
DROP INDEX IF EXISTS public.idx_categories_slug_active;

-- Keep original marketplace index name for category lookups and remove duplicate.
DROP INDEX IF EXISTS public.idx_povprasevanja_category_id;
