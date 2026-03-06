-- Create notification_logs table for audit trail
-- Tracks all notifications sent: email, in-app, SMS, etc.

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN (
    'NEW_REQUEST_MATCHED',
    'RESPONSE_DEADLINE_90MIN',
    'RESPONSE_DEADLINE_BREACH',
    'OFFER_ACCEPTED',
    'NEW_REVIEW_RECEIVED',
    'SUBSCRIPTION_EXPIRING_7D'
  )),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('email', 'in_app', 'sms', 'push')),
  request_id UUID REFERENCES public.povprasevanja(id) ON DELETE SET NULL,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admin can read all notification logs
CREATE POLICY "Admin can read all notification logs"
ON public.notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE auth_user_id = auth.uid() AND aktiven = true
  )
);

-- RLS Policy: Users can read their own notification logs
CREATE POLICY "Users can read own notification logs"
ON public.notification_logs FOR SELECT
USING (recipient_id = auth.uid());

-- RLS Policy: System can insert notification logs
CREATE POLICY "System can insert notification logs"
ON public.notification_logs FOR INSERT
WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_notification_logs_recipient_id ON public.notification_logs(recipient_id);
CREATE INDEX idx_notification_logs_request_id ON public.notification_logs(request_id);
CREATE INDEX idx_notification_logs_type ON public.notification_logs(type);
CREATE INDEX idx_notification_logs_sent_at ON public.notification_logs(sent_at DESC);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX idx_notification_logs_created_at ON public.notification_logs(created_at DESC);

-- Index for checking if notification was already sent (for deduplication)
CREATE INDEX idx_notification_logs_type_request_recipient ON public.notification_logs(type, request_id, recipient_id);

COMMENT ON TABLE public.notification_logs IS 'Audit trail for all notifications sent to users (email, in-app, SMS, push)';
COMMENT ON COLUMN public.notification_logs.type IS 'Notification type: NEW_REQUEST_MATCHED, RESPONSE_DEADLINE_90MIN, RESPONSE_DEADLINE_BREACH, OFFER_ACCEPTED, NEW_REVIEW_RECEIVED, SUBSCRIPTION_EXPIRING_7D';
COMMENT ON COLUMN public.notification_logs.channel IS 'Channel used: email, in_app, sms, push';
COMMENT ON COLUMN public.notification_logs.status IS 'sent = successfully sent, failed = error occurred, skipped = rate limited or quiet hours';
COMMENT ON COLUMN public.notification_logs.metadata IS 'Additional metadata: template variables, retry count, etc.';
