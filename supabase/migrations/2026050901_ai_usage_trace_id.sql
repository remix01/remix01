-- Add trace_id to ai_usage_logs for distributed tracing correlation
ALTER TABLE ai_usage_logs
  ADD COLUMN IF NOT EXISTS trace_id TEXT;

CREATE INDEX IF NOT EXISTS ai_usage_logs_trace_id_idx ON ai_usage_logs (trace_id)
  WHERE trace_id IS NOT NULL;
