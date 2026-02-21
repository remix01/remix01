-- LiftGO Payments Migration
-- Add Stripe payment fields to ponudbe and obrtnik_profiles
-- Create payouts table for tracking commission transfers

-- Add payment fields to ponudbe table
ALTER TABLE public.ponudbe 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid','pending','paid','failed'));

-- Add Stripe Connect fields to obrtnik_profiles
ALTER TABLE public.obrtnik_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarded boolean DEFAULT false;

-- Create payouts table for tracking commission transfers
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ponudba_id uuid REFERENCES public.ponudbe(id) ON DELETE CASCADE,
  obrtnik_id uuid REFERENCES public.obrtnik_profiles(id) ON DELETE CASCADE,
  amount_eur numeric NOT NULL CHECK (amount_eur >= 0),
  commission_eur numeric NOT NULL CHECK (commission_eur >= 0),
  stripe_transfer_id text,
  status text DEFAULT 'pending' 
    CHECK (status IN ('pending','completed','failed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on payouts table
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Create policy: Obrtnik can read their own payouts
CREATE POLICY "Obrtnik can read own payouts"
ON public.payouts FOR SELECT
USING (obrtnik_id = auth.uid());

-- Create policy: Admin users can read all payouts
CREATE POLICY "Admin can read all payouts"
ON public.payouts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.aktiven = true
  )
);

-- Create policy: Only system can insert payouts (via service role)
CREATE POLICY "Service role can insert payouts"
ON public.payouts FOR INSERT
WITH CHECK (true);

-- Create policy: Only system can update payouts (via service role)
CREATE POLICY "Service role can update payouts"
ON public.payouts FOR UPDATE
USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_payouts_obrtnik_id ON public.payouts(obrtnik_id);
CREATE INDEX IF NOT EXISTS idx_payouts_ponudba_id ON public.payouts(ponudba_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON public.payouts(status);
CREATE INDEX IF NOT EXISTS idx_ponudbe_stripe_payment_intent ON public.ponudbe(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_obrtnik_profiles_stripe_account ON public.obrtnik_profiles(stripe_account_id);

-- Create notifications table if it doesn't exist (for payment notifications)
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policy: Users can read their own notifications
CREATE POLICY "Users can read own notifications"
ON public.notifications FOR SELECT
USING (user_id = auth.uid());

-- Create policy: Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (user_id = auth.uid());

-- Create policy: Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Create index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
