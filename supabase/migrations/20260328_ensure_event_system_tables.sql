-- Ensure all event system tables exist (idempotent re-apply)
-- Required by: /api/cron/event-processor, lib/events/outbox.ts,
--              lib/events/deadLetterQueue.ts, lib/events/eventBus.ts,
--              lib/events/idempotency.ts

-- ── event_outbox ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  attempt_count INTEGER DEFAULT 0,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ── event_dlq ────────────────────────────────────────────────────────────────
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

-- ── event_log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  emitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── event_processing_log ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS event_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key TEXT NOT NULL UNIQUE,
  consumer TEXT NOT NULL,
  event_name TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_dlq ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_processing_log ENABLE ROW LEVEL SECURITY;

-- service_role can do everything on event_outbox (bypasses RLS automatically,
-- but explicit policies keep pg_dump / audit tools happy)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='event_outbox' AND policyname='service_role_outbox'
  ) THEN
    CREATE POLICY "service_role_outbox" ON event_outbox
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='event_dlq' AND policyname='admin_dlq'
  ) THEN
    CREATE POLICY "admin_dlq" ON event_dlq
      FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='event_log' AND policyname='admin_read_event_log'
  ) THEN
    CREATE POLICY "admin_read_event_log" ON event_log FOR SELECT
      USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='event_processing_log' AND policyname='service_role_only'
  ) THEN
    CREATE POLICY "service_role_only" ON event_processing_log FOR SELECT
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='event_processing_log' AND policyname='service_role_insert'
  ) THEN
    CREATE POLICY "service_role_insert" ON event_processing_log FOR INSERT
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON event_outbox(status, next_attempt_at)
  WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_outbox_idem ON event_outbox(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_event_log_name ON event_log(event_name, emitted_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_epl_key ON event_processing_log(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_epl_processed_at ON event_processing_log(processed_at);
