import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: adminUser } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // offers.partner_id → partners (has company_name, phone_number)
    const { data: offersData, error: offersError } = await supabaseAdmin
      .from('offers')
      .select(`
        id,
        price,
        payment_status,
        created_at,
        partner:partners!offers_partner_id_fkey(company_name, phone_number)
      `)
      .not('payment_status', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100)

    if (offersError) throw offersError

    // payouts.craftsman_id → auth.users (same UUID as profiles.id)
    const { data: payoutsRaw, error: payoutsError } = await supabaseAdmin
      .from('payouts')
      .select('id, amount, stripe_transfer_id, created_at, craftsman_id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (payoutsError) throw payoutsError

    // Fetch craftsman names from profiles using craftsman_id = profiles.id
    const craftsmanIds = [...new Set((payoutsRaw || []).map((p: any) => p.craftsman_id).filter(Boolean))]
    let craftsmanMap: Record<string, string> = {}
    if (craftsmanIds.length > 0) {
      const { data: craftsmanProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', craftsmanIds)
      craftsmanMap = Object.fromEntries(
        (craftsmanProfiles || []).map((p: any) => [p.id, p.full_name || p.email || 'Unknown'])
      )
    }

    const transactions = (offersData || []).map((offer: any) => ({
      id: offer.id,
      created_at: offer.created_at,
      stranka_name: 'Stranka',
      obrtnik_name: offer.partner?.company_name || 'Unknown',
      amount: offer.price || 0,
      payment_status: offer.payment_status,
    }))

    const payouts = (payoutsRaw || []).map((payout: any) => ({
      id: payout.id,
      created_at: payout.created_at,
      craftsman_name: craftsmanMap[payout.craftsman_id] || 'Unknown',
      amount: payout.amount || 0,
      stripe_transfer_id: payout.stripe_transfer_id || '',
    }))

    return NextResponse.json({ transactions, payouts })
  } catch (error: unknown) {
    console.error('[admin/payments] error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch payment data'
    return NextResponse.json({ error: errorMessage }, { status: 500 })
  }
}
