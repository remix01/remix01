-- =============================================================================
-- Realtime upgrade: obrtnik:{uuid}:offers private channel
-- =============================================================================
-- Extends 20260316_realtime_broadcast.sql with a per-obrtnik offers stream.
-- This lets partners subscribe to their own offer events across all requests,
-- enabling instant UI updates without polling.
--
-- Topic: obrtnik:{obrtnik_id}:offers
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. RLS policy: obrtnik can only subscribe to their own offers channel
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "rt_obrtnik_offers_select" ON realtime.messages;

CREATE POLICY "rt_obrtnik_offers_select"
  ON realtime.messages FOR SELECT
  USING (
    realtime.topic() LIKE 'obrtnik:%:offers'
    AND split_part(realtime.topic(), ':', 2)::uuid = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- 2. Upgrade tr_broadcast_ponudba to also fan-out to obrtnik:{id}:offers
--    Keeps existing povp:{id}:updates broadcast intact.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tr_broadcast_ponudba()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  obr_id uuid := COALESCE(NEW.obrtnik_id, OLD.obrtnik_id);
BEGIN
  -- Existing: broadcast to request-scoped update channel
  PERFORM realtime.broadcast_changes(
    'povp:' || COALESCE(NEW.povprasevanje_id, OLD.povprasevanje_id)::text || ':updates',
    TG_OP::text,
    TG_OP::text,
    TG_TABLE_NAME::text,
    TG_TABLE_SCHEMA::text,
    NEW,
    OLD
  );

  -- New: also broadcast to the obrtnik's own offers channel
  IF obr_id IS NOT NULL THEN
    PERFORM realtime.broadcast_changes(
      'obrtnik:' || obr_id::text || ':offers',
      TG_OP::text,
      TG_OP::text,
      TG_TABLE_NAME::text,
      TG_TABLE_SCHEMA::text,
      NEW,
      OLD
    );
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger already exists from 20260316_realtime_broadcast.sql — just replace fn above.
-- No DROP/CREATE TRIGGER needed; the trigger calls the function by name.

-- ---------------------------------------------------------------------------
-- 3. Index to speed up the new RLS policy lookup (obrtnik_id on ponudbe)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_ponudbe_obrtnik_id
  ON public.ponudbe (obrtnik_id);

COMMIT;
