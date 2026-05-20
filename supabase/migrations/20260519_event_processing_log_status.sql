-- Add status tracking to event_processing_log for safe retry semantics.
-- Previously, failed claims were deleted (allowing duplicates on retry).
-- Now they are marked 'failed' and can be re-claimed atomically.

ALTER TABLE event_processing_log
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'processing',
  ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ;

-- Allow service_role to update status on failure/re-claim
CREATE POLICY "service_role_update" ON event_processing_log
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
