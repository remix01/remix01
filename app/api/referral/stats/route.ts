import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/server'
import { getReferralStats, ensureReferralCode } from '@/lib/referral/referralService'
import { generateReferralLink } from '@/lib/referral/generateCode'

/**
 * Get referral stats for current user
 * GET /api/referral/stats
 */
export async function GET(request: NextRequest) {
  try {
    // Get user from auth
    const supabase = createAdminClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Ensure referral code exists
    const referralCode = await ensureReferralCode(user.id)
    
    // Get referral stats
    const stats = await getReferralStats(user.id)
    
    // Generate referral link
    const referralLink = generateReferralLink(referralCode)
    
    return NextResponse.json({
      referralLink,
      ...stats,
      referralCode,
    })
  } catch (error) {
    console.error('[v0] Referral stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
