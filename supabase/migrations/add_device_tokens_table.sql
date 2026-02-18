-- Create device_tokens table for push notification management
CREATE TABLE IF NOT EXISTS device_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  token text UNIQUE NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web')),
  app_version text,
  device_name text,
  last_seen_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_active 
  ON device_tokens(user_id, is_active);

-- Enable RLS
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view their own tokens
CREATE POLICY "Users can view own device tokens"
  ON device_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own tokens
CREATE POLICY "Users can insert own device tokens"
  ON device_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own tokens
CREATE POLICY "Users can update own device tokens"
  ON device_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policy: Users can delete their own tokens
CREATE POLICY "Users can delete own device tokens"
  ON device_tokens
  FOR DELETE
  USING (auth.uid() = user_id);
