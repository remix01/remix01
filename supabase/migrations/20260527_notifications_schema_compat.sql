-- P0 schema-compat migration: add new canonical columns and preserve legacy aliases.
-- Idempotent: safe to re-run on any DB state.
--
-- Context: two CREATE TABLE migrations exist with different column names.
--   add_notifications_table.sql      → body, link, is_read, metadata
--   2025022202_notifications.sql     → message, link, is_read, metadata
-- Generated Supabase types confirm live DB has: action_url, body, data, read, message
-- This migration ensures ALL columns exist so both old and new code paths work.

-- New canonical columns (read added WITHOUT a default — see backfill step below)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url  text,
  ADD COLUMN IF NOT EXISTS body        text,
  ADD COLUMN IF NOT EXISTS data        jsonb,
  ADD COLUMN IF NOT EXISTS read        boolean,
  ADD COLUMN IF NOT EXISTS channel     text;

-- Legacy alias columns (preserved for backward compat, never dropped)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link        text,
  ADD COLUMN IF NOT EXISTS is_read     boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS metadata    jsonb DEFAULT '{}';

-- Ensure message column exists (created by add_notifications_table.sql but not
-- by 2025022202_notifications.sql in all environments)
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS message     text;

-- Backfill read from is_read so existing rows keep their read state.
-- Using a DO block so the query is safe even if is_read doesn't exist on this
-- DB instance (e.g. created only from newer migrations that never had is_read).
-- Only touches rows where read IS NULL — no-op when read is already populated.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name   = 'notifications'
       AND column_name  = 'is_read'
  ) THEN
    UPDATE public.notifications
       SET read = COALESCE(is_read, false)
     WHERE read IS NULL;
  ELSE
    UPDATE public.notifications
       SET read = false
     WHERE read IS NULL;
  END IF;
END
$$;

-- Now that existing rows are backfilled, apply default for future inserts.
-- ALTER COLUMN is idempotent — safe to run even if the default was already set.
ALTER TABLE public.notifications
  ALTER COLUMN read SET DEFAULT false;

-- Index on read column if missing (mirrors legacy idx_notifications_is_read)
CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON public.notifications (read);
