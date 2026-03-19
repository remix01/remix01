-- Migration: Fix alert_log RLS policy + clean up heartbeat rows
--
-- Problems fixed:
-- 1. Old policy checked profiles.role = 'admin' which never matches
--    (profiles.role is 'narocnik' | 'obrtnik', admins are in admin_users table)
-- 2. event-processor cron was inserting a heartbeat row every 5 min →
--    ~288 rows/day of junk data in alert_log (now removed from cron code)
--    This migration purges the accumulated heartbeat rows.

BEGIN;

-- 1. Fix RLS policy: check admin_users instead of profiles.role
DROP POLICY IF EXISTS "admin_alert_log" ON alert_log;

CREATE POLICY "admin_alert_log" ON alert_log
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE auth_user_id = auth.uid()
        AND aktiven = true
    )
  );

-- 2. Delete accumulated heartbeat rows (alert_type='cron_dead' with type=heartbeat)
--    These are NOT real alerts — they were written by event-processor on every run.
DELETE FROM alert_log
WHERE alert_type = 'cron_dead'
  AND (metadata->>'type') = 'heartbeat';

COMMIT;
