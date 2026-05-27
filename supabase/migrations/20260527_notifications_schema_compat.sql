-- P0 schema-compat migration: add new canonical columns and preserve legacy aliases.
-- Idempotent: safe to re-run on any DB state.
--
-- Context: two CREATE TABLE migrations exist with different column names.
--   add_notifications_table.sql      → body, link, is_read, metadata
--   2025022202_notifications.sql     → message, link, is_read, metadata
-- Generated Supabase types confirm live DB has: action_url, body, data, read, message
-- This migration ensures ALL columns exist so both old and new code paths work.

-- New canonical columns
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url  text,
  ADD COLUMN IF NOT EXISTS body        text,
  ADD COLUMN IF NOT EXISTS data        jsonb,
  ADD COLUMN IF NOT EXISTS read        boolean DEFAULT false,
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

-- Index on read column if missing (mirrors legacy idx_notifications_is_read)
CREATE INDEX IF NOT EXISTS idx_notifications_read
  ON public.notifications (read);
