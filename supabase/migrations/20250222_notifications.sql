-- Create notifications table for Realtime system
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN (
    'nova_ponudba',        -- narocnik: obrtnik sent offer
    'ponudba_sprejeta',    -- obrtnik: his offer was accepted
    'ponudba_zavrnjena',   -- obrtnik: his offer was rejected
    'nova_ocena',          -- obrtnik: received new review
    'termin_potrjen',      -- both: appointment confirmed
    'termin_opomnik',      -- both: appointment reminder (24h before)
    'placilo_prejeto',     -- obrtnik: payment received
    'placilo_zahtevano'    -- narocnik: payment requested
  )),
  title text NOT NULL,
  message text NOT NULL,
  link text,              -- where to redirect on click
  is_read boolean DEFAULT false,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own notifications
CREATE POLICY "Users read own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- RLS Policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- RLS Policy: System can insert notifications (for backend)
CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create indexes for better query performance
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_is_read ON public.notifications(is_read);

-- Enable Realtime for notifications table
ALTER PUBLICATION supabase_realtime 
ADD TABLE public.notifications;
