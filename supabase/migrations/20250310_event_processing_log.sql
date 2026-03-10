-- Idempotency Log Table for Event Processing
-- Prevents duplicate subscriber execution when events are replayed or retry

CREATE TABLE IF NOT EXISTS event_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  -- format: "{eventName}:{consumer}:{entityId}"
  -- example: "task.matched:notify:abc-123-uuid"
  -- example: "task.accepted:escrow:abc-123-uuid"
  consumer TEXT NOT NULL,
  -- subscriber name: 'notify', 'escrow', 'analytics', 'ai_insight'
  event_name TEXT NOT NULL,
  -- event type: 'task.created', 'task.matched', etc.
  entity_id TEXT NOT NULL,
  -- primary entity ID: taskId
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index on idempotency_key for atomic insert + check
CREATE UNIQUE INDEX idx_epl_key ON event_processing_log(idempotency_key);

-- Index for cleanup/TTL: old records after 30 days not needed
CREATE INDEX idx_epl_processed_at ON event_processing_log(processed_at);

-- RLS: admin/service_role only
ALTER TABLE event_processing_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_only" ON event_processing_log
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "service_role_insert" ON event_processing_log
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');
