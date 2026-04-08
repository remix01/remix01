-- Push Subscriptions Table for Web Push Notifications
-- Stores user device subscriptions for browser push notifications

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text,
  auth text,
  device_info text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own push subscriptions
CREATE POLICY "Users manage own push subscriptions"
ON public.push_subscriptions FOR ALL
USING (user_id = auth.uid());

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Comment
COMMENT ON TABLE public.push_subscriptions IS 'Stores web push notification subscriptions for users';
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'Unique push subscription endpoint URL';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS 'Public key for message encryption';
COMMENT ON COLUMN public.push_subscriptions.auth IS 'Authentication secret for push service';
COMMENT ON COLUMN public.push_subscriptions.device_info IS 'Optional device/browser information';
