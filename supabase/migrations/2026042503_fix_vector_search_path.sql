-- Fix vector operator search path for all RAG match functions.
-- The pgvector extension lives in the 'extensions' schema, but functions had
-- search_path=public, causing: "operator does not exist: extensions.vector <=> extensions.vector"

CREATE OR REPLACE FUNCTION public.match_tasks(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  title text,
  description text,
  status text,
  category_id uuid,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path = extensions, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.description,
    t.status,
    t.category_id,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM tasks t
  WHERE t.embedding IS NOT NULL
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_obrtniki(
  query_embedding vector,
  match_threshold double precision DEFAULT 0.7,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  business_name text,
  description text,
  tagline text,
  avg_rating numeric,
  is_available boolean,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path = extensions, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    o.id,
    o.business_name,
    o.description,
    o.tagline,
    o.avg_rating,
    o.is_available,
    1 - (o.embedding <=> query_embedding) AS similarity
  FROM obrtnik_profiles o
  WHERE o.embedding IS NOT NULL
    AND o.is_available = true
    AND 1 - (o.embedding <=> query_embedding) > match_threshold
  ORDER BY o.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_sporocila(
  query_embedding vector,
  conversation_id uuid DEFAULT NULL::uuid,
  match_threshold double precision DEFAULT 0.6,
  match_count integer DEFAULT 20
)
RETURNS TABLE(
  id uuid,
  povprasevanje_id uuid,
  sender_id uuid,
  message text,
  created_at timestamp with time zone,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path = extensions, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.povprasevanje_id,
    s.sender_id,
    s.message,
    s.created_at,
    1 - (s.embedding <=> query_embedding) AS similarity
  FROM sporocila s
  WHERE s.embedding IS NOT NULL
    AND (conversation_id IS NULL OR s.povprasevanje_id = conversation_id)
    AND 1 - (s.embedding <=> query_embedding) > match_threshold
  ORDER BY s.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.match_ponudbe(
  query_embedding vector,
  task_id uuid DEFAULT NULL::uuid,
  match_threshold double precision DEFAULT 0.6,
  match_count integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  povprasevanje_id uuid,
  obrtnik_id uuid,
  message text,
  price_estimate numeric,
  status text,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path = extensions, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.povprasevanje_id,
    p.obrtnik_id,
    p.message,
    p.price_estimate,
    p.status,
    1 - (p.embedding <=> query_embedding) AS similarity
  FROM ponudbe p
  WHERE p.embedding IS NOT NULL
    AND (task_id IS NULL OR p.povprasevanje_id = task_id)
    AND 1 - (p.embedding <=> query_embedding) > match_threshold
  ORDER BY p.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
