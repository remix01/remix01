-- Idempotent backfill: sync read column from is_read for rows created before
-- the schema-compat migration added read as a canonical column.
-- Safe to re-run: WHERE read IS NULL ensures no-op on already-backfilled rows.
UPDATE public.notifications
   SET read = is_read
 WHERE read IS NULL
   AND is_read IS NOT NULL;

-- Rows where both are NULL (pre-compat inserts with no is_read default)
-- default to unread.
UPDATE public.notifications
   SET read = false
 WHERE read IS NULL;
