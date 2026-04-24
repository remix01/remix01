import { getErrorMessage } from '@/lib/utils/error'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return fail('Unauthorized', 401)
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    if (!partnerId) {
      return fail('partner_id je zahtevan', 400)
    }

    // Pridobi ponudbe
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .eq('partner_id', partnerId)

    if (offersError) {
      return fail(offersError.message, 500)
    }

    // Pridobi plačila
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .eq('craftsman_id', partnerId)

    if (payoutsError) {
      return fail(payoutsError.message, 500)
    }

    const stats = {
      totalOffers: offers?.length || 0,
      acceptedOffers: offers?.filter(o => o.status === 'accepted').length || 0,
      pendingOffers: offers?.filter(o => o.status === 'pending').length || 0,
      totalEarnings: payouts?.reduce((sum, p) => sum + (p.amount_eur || 0), 0) || 0,
      pendingPayouts: payouts?.filter(p => p.status === 'pending').length || 0,
    }

    return ok({ success: true, data: stats })
  } catch (error: unknown) {
    console.error('[API] Error fetching partner stats:', error)
    return fail(getErrorMessage(error), 500)
  }
}
