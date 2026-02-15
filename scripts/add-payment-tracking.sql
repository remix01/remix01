-- Add payment tracking columns to offers table
ALTER TABLE offers ADD COLUMN payment_intent_id TEXT;
ALTER TABLE offers ADD COLUMN payment_confirmed_at TIMESTAMPTZ;
ALTER TABLE offers ADD COLUMN payment_status TEXT DEFAULT 'pending';

-- Create payouts table
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  craftsman_id UUID REFERENCES auth.users(id),
  offer_id UUID REFERENCES offers(id),
  amount NUMERIC(10, 2),
  stripe_transfer_id TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_payouts_craftsman_id ON payouts(craftsman_id);
CREATE INDEX idx_payouts_stripe_transfer_id ON payouts(stripe_transfer_id);
CREATE INDEX idx_offers_payment_intent_id ON offers(payment_intent_id);

-- Add stripe columns to partners table
ALTER TABLE partners ADD COLUMN stripe_account_id TEXT;
ALTER TABLE partners ADD COLUMN stripe_onboarding_complete BOOLEAN DEFAULT false;
ALTER TABLE partners ADD COLUMN subscription_plan TEXT DEFAULT 'START';
