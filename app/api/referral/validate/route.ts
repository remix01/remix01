import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { isValidReferralCode } from '@/lib/referral/generateCode'
import { ok, fail } from '@/lib/http/response'

/**
 * Validate referral code and return referrer info
 * GET /api/referral/validate?code=LIFTGO_XXXXX
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code || !isValidReferralCode(code)) {
      return ok({ valid: false })
    }

    const supabase = createAdminClient()

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('referral_code', code)
      .maybeSingle()
    const profile = profileData as { id: string; referral_code: string | null } | null

    if (!profile) {
      return ok({ valid: false })
    }

    const { data: obrtnik } = await supabase
      .from('obrtnik_profiles')
      .select('business_name')
      .eq('id', profile.id)
      .maybeSingle()

    return ok({
      valid: true,
      referrerName: obrtnik?.business_name || 'prijatelj',
    } as Record<string, unknown>)
  } catch (error) {
    console.error('[v0] Referral validation error:', error)
    return fail('Internal server error', 500)
  }
}
