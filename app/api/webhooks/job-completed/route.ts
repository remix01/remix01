import { awardReferralBonus } from '@/lib/referral/referralService'
import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

/**
 * Job completion webhook - award referral bonuses
 * POST /api/webhooks/job-completed
 * Called when a job/task is marked as completed
 */
export async function POST(request: NextRequest) {
  try {
    const { partnerId, jobId } = await request.json()
    
    if (!partnerId || !jobId) {
      return fail('Missing partnerId or jobId', 400)
    }
    
    // Award referral bonus to this user if they have an unrewarded referral
    const success = await awardReferralBonus(partnerId)
    
    if (success) {
      console.log(`[v0] Referral bonus awarded for job ${jobId} completed by ${partnerId}`)
      return ok({ success: true, bonusAwarded: true })
    }
    
    return ok({ success: true, bonusAwarded: false })
  } catch (error) {
    console.error('[v0] Job completion webhook error:', error)
    return fail('Internal server error', 500)
  }
}
