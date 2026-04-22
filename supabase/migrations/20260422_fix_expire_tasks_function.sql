-- Fix expire_tasks() to use sla_expires_at and cover all non-terminal statuses.
--
-- Previous version used a hardcoded 2-hour interval from published_at and only
-- handled 'published' tasks. It also inserted task_events for ALL expired tasks
-- on every run (duplicates). This replaces it with a CTE-based approach that
-- atomically updates and inserts only the newly expired rows.

DROP FUNCTION IF EXISTS public.expire_tasks();

CREATE FUNCTION public.expire_tasks()
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  expired_count integer := 0;
BEGIN
  WITH newly_expired AS (
    UPDATE tasks
    SET status = 'expired'
    WHERE status IN ('published', 'claimed', 'accepted', 'in_progress')
      AND sla_expires_at IS NOT NULL
      AND sla_expires_at < now()
    RETURNING id
  )
  INSERT INTO task_events (task_id, event_type, payload)
  SELECT
    id,
    'expired',
    '{"reason": "SLA deadline passed - automated expiry"}'::jsonb
  FROM newly_expired;

  GET DIAGNOSTICS expired_count = ROW_COUNT;
  RETURN expired_count;
END;
$$;
