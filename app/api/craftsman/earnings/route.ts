import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get partner data
    const { data: partner, error: partnerError } = await supabase
      .from('partners')
      .select('*')
      .eq('id', user.id)
      .single()

    if (partnerError || !partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 })
    }

    // Get all payouts for this craftsman
    const { data: payouts, error: payoutsError } = await supabase
      .from('payouts')
      .select('*')
      .eq('craftsman_id', partner.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (payoutsError) {
      console.error('Error fetching payouts:', payoutsError)
      return NextResponse.json({ error: 'Failed to fetch payouts' }, { status: 500 })
    }

    // Calculate statistics
    const totalEarnings = payouts?.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || 0
    
    // This month earnings
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const thisMonthPayouts = payouts?.filter(p => new Date(p.created_at) >= firstDayOfMonth) || []
    const thisMonthEarnings = thisMonthPayouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)

    // Count paid orders
    const { count: paidOrdersCount } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('partner_id', partner.id)
      .eq('payment_status', 'paid')

    // Pending payouts (paid orders without payout record)
    const { data: paidOffers } = await supabase
      .from('offers')
      .select('id, price')
      .eq('partner_id', partner.id)
      .eq('payment_status', 'paid')

    const paidOfferIds = paidOffers?.map(o => o.id) || []
    const payoutOfferIds = payouts?.map(p => p.offer_id).filter(Boolean) || []
    const pendingOfferIds = paidOfferIds.filter(id => !payoutOfferIds.includes(id))
    
    const pendingPayouts = paidOffers
      ?.filter(o => pendingOfferIds.includes(o.id))
      ?.reduce((sum, o) => sum + (Number(o.price) || 0), 0) || 0

    return NextResponse.json({
      stripeAccountId: partner.stripe_account_id,
      stripeOnboardingComplete: partner.stripe_onboarding_complete || false,
      subscriptionPlan: partner.subscription_plan || 'START',
      statistics: {
        thisMonthEarnings,
        totalEarnings,
        paidOrdersCount: paidOrdersCount || 0,
        pendingPayouts,
      },
      recentPayouts: payouts || [],
    })
  } catch (error) {
    console.error('Error in earnings API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
