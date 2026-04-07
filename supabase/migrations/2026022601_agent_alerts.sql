-- Create agent_alerts table for anomaly detection
CREATE TABLE IF NOT EXISTS agent_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id TEXT,
  details TEXT NOT NULL,
  count INTEGER,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_agent_alerts_active ON agent_alerts(resolved, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_user ON agent_alerts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_alerts_type ON agent_alerts(type, created_at DESC);

-- Row-level security
ALTER TABLE agent_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view and manage all alerts
CREATE POLICY "Admins manage alerts"
ON agent_alerts FOR ALL
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
