-- Add analytics_events table for tracking user and system events
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text NOT NULL,
  event_name text NOT NULL,
  properties jsonb DEFAULT '{}',
  platform text DEFAULT 'web',
  app_version text,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name_created_at 
  ON analytics_events(event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id_created_at 
  ON analytics_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id 
  ON analytics_events(session_id);

-- RLS policies: service_role can INSERT, admins can SELECT
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert (used by tracker)
CREATE POLICY "Service role can insert analytics events"
  ON analytics_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins can read all analytics
CREATE POLICY "Admins can read analytics events"
  ON analytics_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM "User"
      WHERE "User".id::text = auth.uid()::text
      AND "User".role = 'ADMIN'
    )
  );
