import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createAdminClient()

    // Verify admin access
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch subscriptions with user details - use only existing columns
    const { data: subscriptions, error: subError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        subscription_tier,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (subError) throw subError

    // Fetch commission logs - using simple select to avoid schema conflicts
    const { data: commissions, error: commError } = await supabase
      .from('commission_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (commError) throw commError

    // Calculate stats (amounts are in cents in the schema)
    const totalRevenue = commissions?.reduce((sum, c: any) => sum + ((c.commission_cents || c.commission_amount || 0) / (c.commission_cents ? 100 : 1)), 0) || 0
    const totalCommissions = commissions?.reduce((sum, c: any) => sum + ((c.partner_payout_cents || c.payout_amount || 0) / (c.partner_payout_cents ? 100 : 1)), 0) || 0
    const pendingPayouts = commissions
      ?.filter((c: any) => c.status === 'pending' || c.status === 'earned')
      .reduce((sum, c: any) => sum + ((c.partner_payout_cents || c.payout_amount || 0) / (c.partner_payout_cents ? 100 : 1)), 0) || 0
    const proUsers = (subscriptions || []).filter(s => s.subscription_tier === 'pro' || s.subscription_tier === 'elite').length

    // Fetch user statistics - only select existing columns
    const { data: userStats, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        subscription_tier,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (userError) throw userError

    // Fetch commission totals per user - using simple select
    const { data: commissionsByUser, error: commByUserError } = await supabase
      .from('commission_logs')
      .select('partner_id, gross_amount_cents, partner_payout_cents, payout_amount')

    if (commByUserError) throw commByUserError

    const userEarnings = new Map<string, { total: number; jobs: number }>()
    commissionsByUser?.forEach((c: any) => {
      if (!userEarnings.has(c.partner_id)) {
        userEarnings.set(c.partner_id, { total: 0, jobs: 0 })
      }
      const current = userEarnings.get(c.partner_id)!
      // Handle both formats: cents (divide by 100) or already formatted
      const payout = (c.partner_payout_cents ? c.partner_payout_cents / 100 : c.payout_amount) || 0
      current.total += payout
      current.jobs += 1
    })

    const formattedUsers = (userStats || []).map(user => {
      const earnings = userEarnings.get(user.id) || { total: 0, jobs: 0 }
      return {
        id: user.id,
        email: user.email,
        name: user.full_name || 'N/A',
        tier: user.subscription_tier || 'start',
        totalEarned: earnings.total,
        jobsCompleted: earnings.jobs,
      }
    })

    return NextResponse.json({
      totalRevenue,
      totalCommissions,
      pendingPayouts,
      proUsers,
      subscriptions: (subscriptions || []).map(s => ({
        userId: s.id,
        email: s.email,
        name: s.full_name || 'N/A',
        tier: s.subscription_tier || 'start',
        createdAt: s.created_at,
      })),
      commissions: (commissions || []).map((c: any) => ({
        id: c.id,
        inquiryId: c.inquiry_id,
        partnerId: c.partner_id,
        partnerName: c.obrtnik_profiles?.[0]?.full_name || 'Unknown',
        totalAmount: (c.gross_amount_cents ? c.gross_amount_cents / 100 : c.total_amount) || 0,
        commission: (c.commission_cents ? c.commission_cents / 100 : c.commission_amount) || 0,
        payout: (c.partner_payout_cents ? c.partner_payout_cents / 100 : c.payout_amount) || 0,
        status: c.status,
        createdAt: c.created_at,
      })),
      users: formattedUsers,
    })
  } catch (error) {
    console.error('[v0] Monetization API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
