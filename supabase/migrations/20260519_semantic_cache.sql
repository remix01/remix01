-- Semantic cache table for AI response deduplication (user-scoped)
CREATE TABLE IF NOT EXISTS public.semantic_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_message text NOT NULL,
  agent_type text NOT NULL,
  response_text text NOT NULL,
  embedding vector(1536),
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_semantic_cache_agent_type ON public.semantic_cache (agent_type);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_user_id ON public.semantic_cache (user_id);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_embedding ON public.semantic_cache
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS idx_semantic_cache_expires ON public.semantic_cache (expires_at);

-- RPC function for vector similarity lookup (scoped by user_id)
CREATE OR REPLACE FUNCTION public.match_semantic_cache(
  query_embedding vector,
  agent_type_filter text,
  user_id_filter uuid,
  match_threshold double precision DEFAULT 0.95,
  match_count integer DEFAULT 1
)
RETURNS TABLE(
  id uuid,
  user_message text,
  response_text text,
  similarity double precision
)
LANGUAGE plpgsql
SET search_path = extensions, public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sc.id,
    sc.user_message,
    sc.response_text,
    1 - (sc.embedding <=> query_embedding) AS similarity
  FROM public.semantic_cache sc
  WHERE sc.agent_type = agent_type_filter
    AND sc.user_id = user_id_filter
    AND sc.expires_at > now()
    AND sc.embedding IS NOT NULL
    AND 1 - (sc.embedding <=> query_embedding) >= match_threshold
  ORDER BY sc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Cleanup: auto-delete expired rows (run via pg_cron or app-level cron)
-- DELETE FROM public.semantic_cache WHERE expires_at < now();
