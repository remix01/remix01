import { createAdminClient } from '@/lib/supabase/server'
import { generateReferralCode } from './generateCode'

/**
 * Create referral code for user if they don't have one
 */
export async function ensureReferralCode(userId: string): Promise<string> {
  const supabase = createAdminClient()
  
  // Check if user already has a referral code
  const { data: profileData } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .maybeSingle()
  const profile = profileData as { referral_code: string | null } | null

  if (profile?.referral_code && profile.referral_code !== '') {
    return profile.referral_code
  }
  
  // Generate new code
  let code = generateReferralCode()
  let attempts = 0
  const maxAttempts = 10
  
  // Retry if code already exists
  while (attempts < maxAttempts) {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', code)
      .maybeSingle()
    
    if (!existing) break
    
    code = generateReferralCode()
    attempts++
  }
  
  if (attempts >= maxAttempts) {
    throw new Error('Unable to generate unique referral code')
  }
  
  // Save referral code
  const { error } = await supabase
    .from('profiles')
    .update({ referral_code: code })
    .eq('id', userId)
  
  if (error) {
    console.error('[v0] Failed to save referral code:', error)
    throw error
  }
  
  return code
}

/**
 * Link referred user to referrer when they sign up
 */
export async function processReferralCode(
  referralCode: string,
  referredUserId: string
): Promise<boolean> {
  const supabase = createAdminClient()
  
  // Find referrer by code
  const { data: referrerData } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle()
  const referrer = referrerData as { id: string } | null

  if (!referrer) {
    console.warn(`[v0] Invalid referral code: ${referralCode}`)
    return false
  }

  // Check if referral already exists
  const { data: existing } = await supabase
    .from('referrals')
    .select('id')
    .eq('referrer_id', referrer.id)
    .eq('referred_id', referredUserId)
    .maybeSingle()
  
  if (existing) {
    console.warn(`[v0] Referral already exists`)
    return false
  }
  
  // Create referral record
  const { error } = await supabase
    .from('referrals')
    .insert({
      referrer_id: referrer.id,
      referred_id: referredUserId,
      reward_granted: false,
    })
  
  if (error) {
    console.error('[v0] Failed to create referral:', error)
    return false
  }
  
  console.log(`[v0] Referral created: ${referrer.id} referred ${referredUserId}`)
  return true
}

/**
 * Award referral bonus when referred user completes first job
 */
export async function awardReferralBonus(referredUserId: string): Promise<boolean> {
  const supabase = createAdminClient()
  
  // Find the referral record
  const { data: referral } = await supabase
    .from('referrals')
    .select('*')
    .eq('referred_id', referredUserId)
    .eq('reward_granted', false)
    .maybeSingle()
  
  if (!referral) {
    return false // No unrewarded referral found
  }
  
  // Award to both referrer and referred user
  const BONUS_AMOUNT = 5 // €5
  
  // Update referral record
  const { error: refError } = await supabase
    .from('referrals')
    .update({
      reward_granted: true,
      completed_at: new Date().toISOString(),
    })
    .eq('id', referral.id)
  
  if (refError) {
    console.error('[v0] Failed to update referral:', refError)
    return false
  }
  
  // Add credit to referrer (fetch current, add bonus, update)
  const { data: referrerData } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', referral.referrer_id)
    .single()

  const referrerNewBalance = (referrerData?.credit_balance ?? 0) + BONUS_AMOUNT
  const { error: referrerError } = await supabase
    .from('profiles')
    .update({ credit_balance: referrerNewBalance })
    .eq('id', referral.referrer_id)

  // Add credit to referred user
  const { data: referredData } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', referral.referred_id)
    .single()

  const referredNewBalance = (referredData?.credit_balance ?? 0) + BONUS_AMOUNT
  const { error: referredError } = await supabase
    .from('profiles')
    .update({ credit_balance: referredNewBalance })
    .eq('id', referral.referred_id)
  
  if (referrerError || referredError) {
    console.error('[v0] Failed to award credits:', { referrerError, referredError })
    return false
  }
  
  console.log(`[v0] Referral bonus awarded: €${BONUS_AMOUNT} to ${referral.referrer_id} and €${BONUS_AMOUNT} to ${referral.referred_id}`)
  return true
}

/**
 * Get referral stats for a user
 */
export async function getReferralStats(userId: string) {
  const supabase = createAdminClient()
  
  // Get referral code
  const { data: profileData2 } = await supabase
    .from('profiles')
    .select('referral_code, credit_balance')
    .eq('id', userId)
    .maybeSingle()
  const profile = profileData2 as { referral_code: string | null; credit_balance: number } | null

  // Count successful referrals
  const { count: successCount } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('reward_granted', true)
  
  // Count pending referrals
  const { count: pendingCount } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .eq('reward_granted', false)
  
  return {
    referralCode: profile?.referral_code || '',
    creditBalance: profile?.credit_balance || 0,
    successfulReferrals: successCount || 0,
    pendingReferrals: pendingCount || 0,
  }
}
