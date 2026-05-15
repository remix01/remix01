-- Idempotency keys table for HTTP-level request deduplication.
-- Used by withIdempotency() middleware to prevent duplicate mutations.
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key         TEXT PRIMARY KEY,
  status      TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'completed')),
  response_status INTEGER,
  response_body   JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- TTL cleanup: auto-delete keys older than 24h
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_created_at
  ON idempotency_keys (created_at);

-- Periodic cleanup can be done via cron:
-- DELETE FROM idempotency_keys WHERE created_at < now() - INTERVAL '24 hours';
