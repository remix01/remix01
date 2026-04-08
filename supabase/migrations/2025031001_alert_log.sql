-- Alert Log — Monitoring system alerts and health checks
-- Stores all alerts: SLA warnings, DLQ spikes, event lag, stuck sagas, etc.

CREATE TABLE IF NOT EXISTS alert_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  -- 'sla_warning' | 'sla_critical' | 'dlq_spike' | 'event_lag'
  -- | 'saga_stuck' | 'saga_compensating' | 'payment_frozen' | 'funnel_drop' | 'cron_dead'
  severity TEXT NOT NULL CHECK (severity IN ('warn', 'critical')),
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  -- task_id, dlq_count, lag_minutes, saga_id, etc.
  channels_notified TEXT[] DEFAULT '{}',
  -- ['email', 'slack', 'log']
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_alert_log" ON alert_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX idx_al_type_created ON alert_log(alert_type, created_at DESC);
CREATE INDEX idx_al_unresolved ON alert_log(resolved, severity)
  WHERE resolved = false;
