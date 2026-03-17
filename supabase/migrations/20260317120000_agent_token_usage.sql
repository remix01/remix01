-- Agent token usage tracking
-- Each AI agent call logs input/output tokens here
-- Used for per-user billing limits based on subscription plan

CREATE TABLE IF NOT EXISTS agent_token_usage (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agent_name      text        NOT NULL,  -- e.g. 'task-description', 'quote-generator'
  model           text        NOT NULL,  -- e.g. 'claude-haiku-4-5-20251001'
  input_tokens    int         NOT NULL DEFAULT 0,
  output_tokens   int         NOT NULL DEFAULT 0,
  total_tokens    int         NOT NULL DEFAULT 0,
  cost_usd        numeric(10,6),        -- optional cost estimate
  metadata        jsonb,                -- extra context (povprasevanjeId, etc.)
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_token_usage_user_id      ON agent_token_usage(user_id);
CREATE INDEX idx_agent_token_usage_created_at   ON agent_token_usage(created_at DESC);
CREATE INDEX idx_agent_token_usage_agent_name   ON agent_token_usage(agent_name);
CREATE INDEX idx_agent_token_usage_monthly      ON agent_token_usage(user_id, created_at);

-- RLS: users see only their own usage; admins see all
ALTER TABLE agent_token_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token usage"
  ON agent_token_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert/read all"
  ON agent_token_usage FOR ALL
  TO service_role USING (true);

-- Agent job summaries (async generated reports)
-- Stores completed job summaries for ponudbe
CREATE TABLE IF NOT EXISTS agent_job_summaries (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ponudba_id      uuid        NOT NULL REFERENCES ponudbe(id) ON DELETE CASCADE,
  obrtnik_id      uuid        NOT NULL,
  narocnik_id     uuid        NOT NULL,
  summary_text    text        NOT NULL,
  materials_used  jsonb,
  hours_worked    numeric(5,2),
  status          text        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','confirmed')),
  job_id          text,                 -- QStash job ID for async tracking
  generated_at    timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  confirmed_at    timestamptz
);

CREATE INDEX idx_agent_job_summaries_ponudba   ON agent_job_summaries(ponudba_id);
CREATE INDEX idx_agent_job_summaries_obrtnik   ON agent_job_summaries(obrtnik_id);
CREATE INDEX idx_agent_job_summaries_narocnik  ON agent_job_summaries(narocnik_id);

ALTER TABLE agent_job_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Obrtnik can manage own summaries"
  ON agent_job_summaries FOR ALL
  USING (
    obrtnik_id IN (
      SELECT id FROM obrtnik_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Narocnik can read own summaries"
  ON agent_job_summaries FOR SELECT
  USING (auth.uid() = narocnik_id);

CREATE POLICY "Service role full access"
  ON agent_job_summaries FOR ALL
  TO service_role USING (true);
