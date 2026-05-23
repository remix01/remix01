CREATE OR REPLACE FUNCTION public.increment_sandbox_session_usage(
  p_sandbox_id text,
  p_runtime_ms integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.sandbox_sessions
  SET
    runtime_total_ms = runtime_total_ms + GREATEST(COALESCE(p_runtime_ms, 0), 0),
    execution_count = execution_count + 1
  WHERE sandbox_id = p_sandbox_id;
END;
$$;
