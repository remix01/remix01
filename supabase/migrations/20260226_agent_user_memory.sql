-- Long-term memory table for the LiftGO AI agent
-- Stores per-user preferences, recent tool activity, and an AI-generated summary.

CREATE TABLE IF NOT EXISTS agent_user_memory (
  user_id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferences     JSONB        NOT NULL DEFAULT '{}',
  recent_activity JSONB        NOT NULL DEFAULT '[]',
  summary         TEXT,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

ALTER TABLE agent_user_memory ENABLE ROW LEVEL SECURITY;

-- Users may only read/write their own memory row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'agent_user_memory'
      AND policyname = 'Users can only access own memory'
  ) THEN
    CREATE POLICY "Users can only access own memory"
      ON agent_user_memory
      FOR ALL
      USING (user_id = auth.uid());
  END IF;
END$$;
