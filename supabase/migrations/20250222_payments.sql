-- Add payment columns to ponudbe table
ALTER TABLE public.ponudbe 
ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid'
  CHECK (payment_status IN ('unpaid','pending','paid','failed'));

-- Add Stripe account columns to obrtnik_profiles table
ALTER TABLE public.obrtnik_profiles
ADD COLUMN IF NOT EXISTS stripe_account_id text,
ADD COLUMN IF NOT EXISTS stripe_onboarded boolean DEFAULT false;

-- Create payouts table
CREATE TABLE IF NOT EXISTS public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ponudba_id uuid REFERENCES ponudbe(id),
  obrtnik_id uuid REFERENCES obrtnik_profiles(id),
  amount_eur numeric NOT NULL,
  commission_eur numeric NOT NULL,
  stripe_transfer_id text,
  status text DEFAULT 'pending' 
    CHECK (status IN ('pending','completed','failed')),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on payouts
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for obrtnik to read own payouts
CREATE POLICY "Obrtnik can read own payouts"
ON public.payouts FOR SELECT
USING (obrtnik_id = auth.uid());

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_payouts_obrtnik_id ON public.payouts(obrtnik_id);
CREATE INDEX IF NOT EXISTS idx_payouts_ponudba_id ON public.payouts(ponudba_id);
CREATE INDEX IF NOT EXISTS idx_ponudbe_stripe_payment_intent_id ON public.ponudbe(stripe_payment_intent_id);
