-- Add SEO and localization columns to categories table
ALTER TABLE categories
  ADD COLUMN IF NOT EXISTS name_slo TEXT,
  ADD COLUMN IF NOT EXISTS meta_title TEXT,
  ADD COLUMN IF NOT EXISTS meta_description TEXT;
