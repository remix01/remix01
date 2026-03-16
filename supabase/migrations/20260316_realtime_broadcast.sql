-- =============================================================================
-- Realtime Private Channels: RLS + Broadcast Triggers
-- =============================================================================
-- Upgrades Supabase Realtime from public postgres_changes to
-- authenticated private channels with DB-triggered broadcasts.
--
-- Streams:
--   1. Chat         → room:povp:{povprasevanje_id}:messages   (sporocila)
--   2. Job updates  → povp:{povprasevanje_id}:updates         (povprasevanja + ponudbe)
--   3. Notifications→ user:{user_id}:notifications            (notifications)
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Part A: RLS on realtime.messages (private channel authorization)
-- ---------------------------------------------------------------------------
-- When a client subscribes to a private channel, the Realtime server
-- evaluates SELECT policies on realtime.messages to authorize access.
-- INSERT policies control who can broadcast (client-to-client);
-- DB triggers bypass INSERT RLS via SECURITY DEFINER.
-- ---------------------------------------------------------------------------

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to allow idempotent re-runs
DROP POLICY IF EXISTS "rt_chat_participants_select"       ON realtime.messages;
DROP POLICY IF EXISTS "rt_request_participants_select"    ON realtime.messages;
DROP POLICY IF EXISTS "rt_own_notifications_select"       ON realtime.messages;
DROP POLICY IF EXISTS "rt_chat_broadcast_insert"          ON realtime.messages;


-- ── Helper: is the current user a chat participant for a given povprasevanje? ──
-- Used by both the chat and updates channel policies.
CREATE OR REPLACE FUNCTION realtime.liftgo_is_participant(
  p_id uuid,
  uid  uuid
) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    -- narocnik who created the request
    EXISTS (SELECT 1 FROM public.povprasevanja WHERE id = p_id AND narocnik_id = uid)
    OR
    -- any obrtnik who submitted an offer (sent or accepted)
    EXISTS (SELECT 1 FROM public.ponudbe WHERE povprasevanje_id = p_id AND obrtnik_id = uid)
$$;


-- ── 1. Chat messages: room:povp:{uuid}:messages ──────────────────────────────
CREATE POLICY "rt_chat_participants_select"
  ON realtime.messages FOR SELECT
  USING (
    realtime.topic() LIKE 'room:povp:%:messages'
    AND realtime.liftgo_is_participant(
      split_part(realtime.topic(), ':', 3)::uuid,
      auth.uid()
    )
  );

-- ── 2. Job/offer updates: povp:{uuid}:updates ───────────────────────────────
CREATE POLICY "rt_request_participants_select"
  ON realtime.messages FOR SELECT
  USING (
    realtime.topic() LIKE 'povp:%:updates'
    AND realtime.liftgo_is_participant(
      split_part(realtime.topic(), ':', 2)::uuid,
      auth.uid()
    )
  );

-- ── 3. Per-user notifications: user:{uuid}:notifications ────────────────────
CREATE POLICY "rt_own_notifications_select"
  ON realtime.messages FOR SELECT
  USING (
    realtime.topic() LIKE 'user:%:notifications'
    AND split_part(realtime.topic(), ':', 2)::uuid = auth.uid()
  );

-- ── 4. Client → server broadcast INSERT (typing indicators, etc.) ────────────
--    Only participants of that chat room may send broadcasts.
CREATE POLICY "rt_chat_broadcast_insert"
  ON realtime.messages FOR INSERT
  WITH CHECK (
    realtime.topic() LIKE 'room:povp:%:messages'
    AND realtime.liftgo_is_participant(
      split_part(realtime.topic(), ':', 3)::uuid,
      auth.uid()
    )
  );


-- ---------------------------------------------------------------------------
-- Part B: SECURITY DEFINER trigger functions
-- ---------------------------------------------------------------------------
-- Each function calls realtime.broadcast_changes() which publishes the row
-- change to all authorized subscribers of the private topic.
-- SECURITY DEFINER + fixed search_path bypasses INSERT RLS on realtime.messages.
-- ---------------------------------------------------------------------------


-- ── Trigger: sporocila → room:povp:{id}:messages ────────────────────────────
CREATE OR REPLACE FUNCTION public.tr_broadcast_sporocila()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    ('room:povp:' || COALESCE(NEW.povprasevanje_id, OLD.povprasevanje_id)::text || ':messages'),
    TG_OP::text,
    TG_OP::text,
    TG_TABLE_NAME::text,
    TG_TABLE_SCHEMA::text,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_sporocila ON public.sporocila;
CREATE TRIGGER trg_broadcast_sporocila
  AFTER INSERT OR UPDATE
  ON public.sporocila
  FOR EACH ROW EXECUTE FUNCTION public.tr_broadcast_sporocila();


-- ── Trigger: povprasevanja → povp:{id}:updates ──────────────────────────────
CREATE OR REPLACE FUNCTION public.tr_broadcast_povprasevanje()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Only broadcast meaningful status changes, not every update
  IF (TG_OP = 'INSERT') OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    PERFORM realtime.broadcast_changes(
      ('povp:' || COALESCE(NEW.id, OLD.id)::text || ':updates'),
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

DROP TRIGGER IF EXISTS trg_broadcast_povprasevanje ON public.povprasevanja;
CREATE TRIGGER trg_broadcast_povprasevanje
  AFTER INSERT OR UPDATE
  ON public.povprasevanja
  FOR EACH ROW EXECUTE FUNCTION public.tr_broadcast_povprasevanje();


-- ── Trigger: ponudbe → povp:{povprasevanje_id}:updates ──────────────────────
CREATE OR REPLACE FUNCTION public.tr_broadcast_ponudba()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    ('povp:' || COALESCE(NEW.povprasevanje_id, OLD.povprasevanje_id)::text || ':updates'),
    TG_OP::text,
    TG_OP::text,
    TG_TABLE_NAME::text,
    TG_TABLE_SCHEMA::text,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_ponudba ON public.ponudbe;
CREATE TRIGGER trg_broadcast_ponudba
  AFTER INSERT OR UPDATE OR DELETE
  ON public.ponudbe
  FOR EACH ROW EXECUTE FUNCTION public.tr_broadcast_ponudba();


-- ── Trigger: notifications → user:{user_id}:notifications ───────────────────
CREATE OR REPLACE FUNCTION public.tr_broadcast_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM realtime.broadcast_changes(
    ('user:' || COALESCE(NEW.user_id, OLD.user_id)::text || ':notifications'),
    TG_OP::text,
    TG_OP::text,
    TG_TABLE_NAME::text,
    TG_TABLE_SCHEMA::text,
    NEW,
    OLD
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_notification ON public.notifications;
CREATE TRIGGER trg_broadcast_notification
  AFTER INSERT OR UPDATE
  ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.tr_broadcast_notification();


-- ---------------------------------------------------------------------------
-- Part C: Supporting indexes for participant lookup (used by RLS helper fn)
-- ---------------------------------------------------------------------------
-- These speed up the liftgo_is_participant() function called on every
-- channel subscription authorization check.

CREATE INDEX IF NOT EXISTS idx_ponudbe_obrtnik_povp
  ON public.ponudbe (obrtnik_id, povprasevanje_id);

CREATE INDEX IF NOT EXISTS idx_povprasevanja_narocnik_id
  ON public.povprasevanja (narocnik_id);

COMMIT;

-- ---------------------------------------------------------------------------
-- Notes for deployment:
-- ---------------------------------------------------------------------------
-- 1. Run this migration against your Supabase project:
--      supabase db push  OR  paste into SQL editor in dashboard
--
-- 2. The tables (sporocila, povprasevanja, ponudbe, notifications) remain
--    in the supabase_realtime publication for backward-compat with any
--    legacy postgres_changes subscribers. You may remove them once all
--    clients are on the new private-channel broadcast hooks.
--
-- 3. Client hooks use:  { config: { private: true } }  on the channel.
--    The Supabase JS client automatically sends the session JWT in the
--    Realtime websocket — no manual setAuth() needed per subscription.
-- ---------------------------------------------------------------------------
