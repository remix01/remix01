-- ============================================================================
-- SEO PAGES TABLE
-- Admin-managed per-page SEO overrides; falls back to auto-generated content
-- when empty. Public-readable, admin-writable only.
-- slug: unique identifier, e.g. 'sl/elektriki/ljubljana' or 'de/installation'
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.seo_pages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  locale       text NOT NULL DEFAULT 'sl',
  category_slug text,
  city_slug    text,

  meta_title        text,
  meta_description  text,
  h1_override       text,
  intro_text        text,
  faq_items         jsonb DEFAULT '[]'::jsonb,

  is_indexed   boolean NOT NULL DEFAULT true,

  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.seo_pages_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seo_pages_updated_at ON public.seo_pages;
CREATE TRIGGER trg_seo_pages_updated_at
  BEFORE UPDATE ON public.seo_pages
  FOR EACH ROW EXECUTE FUNCTION public.seo_pages_set_updated_at();

CREATE INDEX IF NOT EXISTS idx_seo_pages_slug        ON public.seo_pages(slug);
CREATE INDEX IF NOT EXISTS idx_seo_pages_locale      ON public.seo_pages(locale);
CREATE INDEX IF NOT EXISTS idx_seo_pages_category    ON public.seo_pages(category_slug);
CREATE INDEX IF NOT EXISTS idx_seo_pages_is_indexed  ON public.seo_pages(is_indexed) WHERE is_indexed = true;

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "seo_pages_public_read" ON public.seo_pages
  FOR SELECT USING (true);

CREATE POLICY "seo_pages_admin_all" ON public.seo_pages
  FOR ALL USING (public.is_admin());
