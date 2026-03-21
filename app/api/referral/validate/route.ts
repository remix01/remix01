import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isValidReferralCode } from '@/lib/referral/generateCode'

/**
 * Validate referral code and return referrer info
 * GET /api/referral/validate?code=LIFTGO_XXXXX
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    
    if (!code || !isValidReferralCode(code)) {
      return NextResponse.json({ valid: false }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('referral_code', code)
      .maybeSingle()
    const profile = profileData as { id: string; referral_code: string | null } | null

    if (!profile) {
      return NextResponse.json({ valid: false }, { status: 404 })
    }
    
    // Get referrer name from obrtnik_profiles
    const { data: obrtnik } = await supabase
      .from('obrtnik_profiles')
      .select('business_name')
      .eq('id', profile.id)
      .maybeSingle()
    
    return NextResponse.json({
      valid: true,
      referrerName: obrtnik?.business_name || 'prijatelj',
    })
  } catch (error) {
    console.error('[v0] Referral validation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
