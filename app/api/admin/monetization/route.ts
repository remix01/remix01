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

    // Fetch subscriptions with user details
    const { data: subscriptions, error: subError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        subscription_tier,
        stripe_customer_id,
        created_at,
        stripe_subscription_id
      `)
      .order('created_at', { ascending: false })

    if (subError) throw subError

    // Fetch commission logs
    const { data: commissions, error: commError } = await supabase
      .from('commission_logs')
      .select(`
        id,
        job_id,
        partner_id,
        total_amount,
        commission_amount,
        payout_amount,
        status,
        created_at,
        obrtnik_profiles!inner(full_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    if (commError) throw commError

    // Calculate stats
    const totalRevenue = commissions?.reduce((sum, c) => sum + (c.commission_amount || 0), 0) || 0
    const totalCommissions = commissions?.reduce((sum, c) => sum + (c.payout_amount || 0), 0) || 0
    const pendingPayouts = commissions
      ?.filter(c => c.status === 'pending' || c.status === 'earned')
      .reduce((sum, c) => sum + (c.payout_amount || 0), 0) || 0
    const proUsers = (subscriptions || []).filter(s => s.subscription_tier === 'pro' || s.subscription_tier === 'elite').length

    // Fetch user statistics
    const { data: userStats, error: userError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        subscription_tier,
        is_active,
        flagged,
        last_activity_at,
        ai_messages_used_today
      `)
      .order('created_at', { ascending: false })

    if (userError) throw userError

    // Fetch commission totals per user
    const { data: commissionsByUser, error: commByUserError } = await supabase
      .from('commission_logs')
      .select('partner_id, total_amount, payout_amount')

    if (commByUserError) throw commByUserError

    const userEarnings = new Map<string, { total: number; jobs: number }>()
    commissionsByUser?.forEach(c => {
      if (!userEarnings.has(c.partner_id)) {
        userEarnings.set(c.partner_id, { total: 0, jobs: 0 })
      }
      const current = userEarnings.get(c.partner_id)!
      current.total += c.payout_amount || 0
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
        lastActive: user.last_activity_at || new Date().toISOString(),
        isActive: user.is_active !== false,
        isFlagged: user.flagged === true,
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
        stripeCustomerId: s.stripe_customer_id,
        createdAt: s.created_at,
        nextBillingDate: s.stripe_subscription_id ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
      })),
      commissions: (commissions || []).map((c: any) => ({
        id: c.id,
        jobId: c.job_id,
        partnerId: c.partner_id,
        partnerName: c.obrtnik_profiles?.[0]?.full_name || 'Unknown',
        totalAmount: c.total_amount,
        commission: c.commission_amount,
        payout: c.payout_amount,
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
