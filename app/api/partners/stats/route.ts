import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id')

    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'partner_id je zahtevan' },
        { status: 400 }
      )
    }

    // Pridobi ponudbe
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('*')
      .eq('partner_id', partnerId)

    if (offersError) {
      return NextResponse.json({ success: false, error: offersError.message }, { status: 500 })
    }

    // Pridobi plačila
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .eq('craftsman_id', partnerId)

    if (payoutsError) {
      return NextResponse.json({ success: false, error: payoutsError.message }, { status: 500 })
    }

    const stats = {
      totalOffers: offers?.length || 0,
      acceptedOffers: offers?.filter(o => o.status === 'accepted').length || 0,
      pendingOffers: offers?.filter(o => o.status === 'pending').length || 0,
      totalEarnings: payouts?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0,
      pendingPayouts: payouts?.filter(p => p.status === 'pending').length || 0,
    }

    return NextResponse.json({ success: true, data: stats })
  } catch (error: any) {
    console.error('[API] Error fetching partner stats:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
