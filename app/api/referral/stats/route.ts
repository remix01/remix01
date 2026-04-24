import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/server'
import { getReferralStats, ensureReferralCode } from '@/lib/referral/referralService'
import { generateReferralLink } from '@/lib/referral/generateCode'
import { ok, fail } from '@/lib/http/response'

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
      return fail('Unauthorized', 401)
    }
    
    // Ensure referral code exists
    const referralCode = await ensureReferralCode(user.id)
    
    // Get referral stats
    const stats = await getReferralStats(user.id)
    
    // Generate referral link
    const referralLink = generateReferralLink(referralCode)
    
    return ok({
      ...stats,
      referralCode,
      referralLink,
    })
  } catch (error) {
    console.error('[v0] Referral stats error:', error)
    return fail('Internal server error', 500)
  }
}
