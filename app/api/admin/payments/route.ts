import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'

export async function GET() {
  try {
    await requireAdmin()

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

    return NextResponse.json({ ok: true, transactions, payouts })
  } catch (error: unknown) {
    console.error('[admin/payments] error:', error)
    const authFailure = toAdminAuthFailure(error)
    if (authFailure.code === 'UNAUTHORIZED' || authFailure.code === 'FORBIDDEN') {
      return NextResponse.json(
        {
          ok: false,
          error: authFailure.message,
          canonical_error: {
            code: authFailure.code,
            message: authFailure.message,
          },
        },
        { status: authFailure.status }
      )
    }

    const message = (error as any)?.message || 'Failed to fetch payment data'
    return NextResponse.json(
      {
        ok: false,
        error: message,
        canonical_error: {
          code: 'INTERNAL_ERROR',
          message,
        },
      },
      { status: 500 }
    )
  }
}
