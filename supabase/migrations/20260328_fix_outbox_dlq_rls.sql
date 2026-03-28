-- Fix RLS policies on event_outbox and event_dlq
-- The cron worker (service_role) needs full INSERT/UPDATE/SELECT access.
-- The original admin_dlq policy only covers authenticated admin users,
-- blocking the service_role client from writing to event_dlq.

-- ── event_outbox ────────────────────────────────────────────────────────────

-- Drop old single USING-only policy (had no explicit INSERT coverage)
DROP POLICY IF EXISTS "service_role_outbox" ON event_outbox;

-- Full access for service_role (cron worker)
CREATE POLICY "service_role_outbox_all" ON event_outbox
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── event_dlq ───────────────────────────────────────────────────────────────

-- Drop old policy that only allowed admin users (blocked cron worker)
DROP POLICY IF EXISTS "admin_dlq" ON event_dlq;

-- Service_role (cron worker) needs INSERT + SELECT access to manage DLQ
CREATE POLICY "service_role_dlq_all" ON event_dlq
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admin users can read and resolve DLQ items (SELECT + UPDATE only)
CREATE POLICY "admin_dlq_read_resolve" ON event_dlq
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "admin_dlq_update" ON event_dlq
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));
