-- Add referral_code column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code VARCHAR(12) UNIQUE NOT NULL DEFAULT '';

-- Create referrals table to track referrals
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  referred_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reward_granted BOOLEAN DEFAULT FALSE,
  reward_type VARCHAR(20) DEFAULT 'credit', -- 'credit' or 'pro_days'
  reward_amount NUMERIC(10, 2) DEFAULT 5, -- €5 credit or days
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  UNIQUE(referrer_id, referred_id),
  CONSTRAINT different_users CHECK (referrer_id != referred_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_reward_granted ON referrals(reward_granted);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);

-- Enable RLS on referrals table
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals"
  ON referrals FOR SELECT
  USING (
    auth.uid() = referrer_id OR auth.uid() = referred_id OR
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

CREATE POLICY "System can create referrals"
  ON referrals FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "System can update referrals"
  ON referrals FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM admin_users WHERE auth_user_id = auth.uid())
  );

-- Add referral_code to profiles RLS (allow users to view their own)
CREATE POLICY "Users can view referral code"
  ON profiles FOR SELECT
  USING (TRUE);

-- Add credit_balance column for tracking rewards
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS credit_balance NUMERIC(10, 2) DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pro_days_earned INTEGER DEFAULT 0;
