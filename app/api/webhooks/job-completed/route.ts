import { awardReferralBonus } from '@/lib/referral/referralService'
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

/**
 * Job completion webhook - award referral bonuses
 * POST /api/webhooks/job-completed
 * Called when a job/task is marked as completed
 */
export async function POST(request: NextRequest) {
  try {
    const { partnerId, jobId } = await request.json()
    
    if (!partnerId || !jobId) {
      return NextResponse.json(
        { error: 'Missing partnerId or jobId' },
        { status: 400 }
      )
    }
    
    // Award referral bonus to this user if they have an unrewarded referral
    const success = await awardReferralBonus(partnerId)
    
    if (success) {
      console.log(`[v0] Referral bonus awarded for job ${jobId} completed by ${partnerId}`)
      return NextResponse.json({ success: true, bonusAwarded: true })
    }
    
    return NextResponse.json({ success: true, bonusAwarded: false })
  } catch (error) {
    console.error('[v0] Job completion webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
