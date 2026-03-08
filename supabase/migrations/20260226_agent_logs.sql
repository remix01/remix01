CREATE TABLE IF NOT EXISTS agent_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  TEXT        NOT NULL,
  user_id     UUID        REFERENCES auth.users(id),
  level       TEXT        NOT NULL,
  event       TEXT        NOT NULL,
  tool        TEXT,
  params      JSONB,
  result      JSONB,
  duration_ms INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_user    ON agent_logs(user_id,    created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_event   ON agent_logs(event,      created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session ON agent_logs(session_id);

ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins see all logs"
  ON agent_logs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
