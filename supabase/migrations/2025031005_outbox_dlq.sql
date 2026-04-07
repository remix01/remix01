-- Outbox: eventi čakajo na procesiranje
CREATE TABLE IF NOT EXISTS event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  -- idempotency_key = event_name + ':' + taskId + ':' + timestamp
  -- prepreči dvojno procesiranje istega eventa
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempt_count INTEGER DEFAULT 0,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- DLQ: eventi ki niso uspeli po 3 poskusih
CREATE TABLE IF NOT EXISTS event_dlq (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_outbox_id UUID REFERENCES event_outbox(id),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  failure_reason TEXT,
  attempt_count INTEGER,
  failed_at TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID
);

ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dlq ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_outbox" ON event_outbox
  USING (auth.role() = 'service_role');

CREATE POLICY "admin_dlq" ON event_dlq
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Index za cron worker: pick up pending events
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON event_outbox(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_outbox_idem ON event_outbox(idempotency_key);
