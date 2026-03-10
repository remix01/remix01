-- Event System Tables — Audit trail + Analytics

-- Event log — append-only audit trail
-- All events (task lifecycle, payments) are logged here for debugging and compliance
CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  emitted_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read event logs
CREATE POLICY "admin_read_event_log" ON event_log FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Service role writes events (no RLS needed for writes)
CREATE INDEX idx_event_log_name ON event_log(event_name, emitted_at DESC);
CREATE INDEX idx_event_log_payload_task ON event_log USING GIN (payload jsonb_path_ops);

-- Analytics events — structured event data for dashboards and queries
-- De-normalized for fast querying without JSON parsing
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event TEXT NOT NULL,                    -- task_created, task_matched, task_accepted, etc.
  task_id UUID,
  partner_id UUID,
  category_id UUID,
  region_lat NUMERIC(9,6),
  region_lng NUMERIC(9,6),
  top_score NUMERIC(5,2),                 -- for task_matched
  price NUMERIC(10,2),                    -- for task_accepted
  final_price NUMERIC(10,2),              -- for task_completed
  gross NUMERIC(10,2),                    -- for payment_released
  commission NUMERIC(10,2),               -- for payment_released (commission amount)
  net NUMERIC(10,2),                      -- for payment_released (gross - commission)
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Only admins can read analytics
CREATE POLICY "admin_read_analytics_events" ON analytics_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Indexes for common queries
CREATE INDEX idx_analytics_event_occurred ON analytics_events(event, occurred_at DESC);
CREATE INDEX idx_analytics_task_id ON analytics_events(task_id);
CREATE INDEX idx_analytics_partner_id ON analytics_events(partner_id);
CREATE INDEX idx_analytics_category_id ON analytics_events(category_id);
