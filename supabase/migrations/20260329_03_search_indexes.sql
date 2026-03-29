-- =============================================================
-- Migration: Full-text search indexes with trigrams + unaccent
-- Date: 2026-03-29
-- Description: GIN trigram indexes for fast fuzzy search,
--              updated hybrid_search_tasks with unaccent support
-- =============================================================

-- Iskanje povpraševanj po naslovu in opisu
CREATE INDEX IF NOT EXISTS idx_povprasevanja_title_trgm
  ON public.povprasevanja USING gin (title extensions.gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_povprasevanja_desc_trgm
  ON public.povprasevanja USING gin (description extensions.gin_trgm_ops);

-- Iskanje obrtnik profilov po imenu podjetja
CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_business_trgm
  ON public.obrtnik_profiles USING gin (business_name extensions.gin_trgm_ops)
  WHERE business_name IS NOT NULL;

-- Iskanje kategorij po imenu
CREATE INDEX IF NOT EXISTS idx_categories_name_trgm
  ON public.categories USING gin (name extensions.gin_trgm_ops);

-- Iskanje sporocil po vsebini
CREATE INDEX IF NOT EXISTS idx_sporocila_message_trgm
  ON public.sporocila USING gin (message extensions.gin_trgm_ops)
  WHERE message IS NOT NULL;

-- Posodobljena hybrid_search_tasks z unaccent podporo
CREATE OR REPLACE FUNCTION public.hybrid_search_tasks(
  query_text text,
  query_embedding extensions.vector,
  match_threshold float DEFAULT 0.3,
  match_count int DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  status text,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    GREATEST(
      1 - (t.embedding <=> query_embedding),
      similarity(
        unaccent(t.title || ' ' || COALESCE(t.description, '')),
        unaccent(query_text)
      )
    ) AS similarity
  FROM tasks t
  WHERE t.status = 'published'
    AND t.embedding IS NOT NULL
    AND (
      1 - (t.embedding <=> query_embedding) > match_threshold
      OR similarity(
           unaccent(t.title || ' ' || COALESCE(t.description, '')),
           unaccent(query_text)
         ) > 0.2
    )
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;
