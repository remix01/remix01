-- Centralized SEO page metadata override table
-- Auto-generated programmatic content is the default; rows here override it.
-- locale: 'sl', 'de', 'hr', etc.
-- category_slug: slug in the locale's language (e.g. 'installation' for de)
-- sl_category_slug: original SL slug for DB category lookups
-- city_slug: null = category-level page, set = category+city page

CREATE TABLE IF NOT EXISTS public.seo_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  locale TEXT NOT NULL,
  category_slug TEXT NOT NULL,
  sl_category_slug TEXT NOT NULL,
  city_slug TEXT,
  meta_title TEXT,
  meta_description TEXT,
  h1_override TEXT,
  intro_text TEXT,
  faq_items JSONB,           -- array of {question, answer}
  is_indexed BOOLEAN NOT NULL DEFAULT TRUE,
  custom_canonical TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seo_pages_unique_page UNIQUE (locale, category_slug, city_slug)
);

CREATE INDEX IF NOT EXISTS seo_pages_lookup_idx
  ON public.seo_pages (locale, category_slug, city_slug);

-- Update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_seo_pages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS seo_pages_updated_at ON public.seo_pages;
CREATE TRIGGER seo_pages_updated_at
  BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.set_seo_pages_updated_at();

-- RLS: public read, admin write
ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_pages_public_read" ON public.seo_pages
  FOR SELECT USING (TRUE);

CREATE POLICY "seo_pages_admin_write" ON public.seo_pages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE auth_user_id = auth.uid() AND aktiven = TRUE
    )
  );

COMMENT ON TABLE public.seo_pages IS
  'Optional per-page SEO metadata overrides. Auto-generated content is used when no row matches.';
COMMENT ON COLUMN public.seo_pages.faq_items IS
  'JSON array of {question: string, answer: string} objects';
COMMENT ON COLUMN public.seo_pages.is_indexed IS
  'Set to FALSE to add noindex to a specific page without code changes';
