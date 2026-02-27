-- Create notifications table for LiftGO app with Realtime support
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL CHECK (type IN ('NEW_INQUIRY','OFFER_RECEIVED','OFFER_ACCEPTED','STATUS_CHANGED','PAYMENT_RECEIVED','NEW_MESSAGE','REVIEW_RECEIVED','SYSTEM','offer_received','escrow_captured','escrow_released','dispute_opened','message_received')),
  title text NOT NULL,
  body text NOT NULL,
  message text,
  resource_id text,
  resource_type text,
  link text,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_read_created 
  ON notifications(user_id, is_read, created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only read their own notifications
CREATE POLICY notifications_select_own 
  ON notifications 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Policy: Users can only update their own notifications (mark as read)
CREATE POLICY notifications_update_own 
  ON notifications 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Enable Realtime for real-time notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
