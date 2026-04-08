import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET(request: NextRequest) {
  try {
    // Check admin auth using admin_users table (consistent with /api/admin/me)
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      console.log('[v0] Analytics summary: No authenticated user')
      return NextResponse.json({ error: 'Neavtoriziran' }, { status: 401 })
    }

    // Check admin_users table for aktiven=true (consistent with /api/admin/violations)
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError) {
      console.error('[v0] Analytics summary: Admin check error', adminError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!admin) {
      console.log('[v0] Analytics summary: User not an active admin')
      return NextResponse.json({ error: 'Dostop zavrnjen' }, { status: 403 })
    }

    // Get today's date range
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Get 7 days ago
    const sevenDaysAgo = new Date(today)
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    // Today's stats
    const { count: todayEvents, error: eventsError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (eventsError) {
      console.error('[v0] Analytics: Events count error', eventsError)
      return NextResponse.json(
        { error: 'Napaka pri pridobivanju podatkov' },
        { status: 500 }
      )
    }

    const { data: todayActiveUsers, error: usersError } = await supabaseAdmin
      .from('analytics_events')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .not('user_id', 'is', null)

    if (usersError) {
      console.error('[v0] Analytics: Active users error', usersError)
    }

    const uniqueActiveUsers = new Set(
      todayActiveUsers?.map((e) => e.user_id) || []
    ).size

    const { count: todayInquiries, error: inquiriesError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (inquiriesError) {
      console.error('[v0] Analytics: Inquiries count error', inquiriesError)
    }

    const { count: todayConversions, error: conversionsError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'payment_completed')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    if (conversionsError) {
      console.error('[v0] Analytics: Conversions count error', conversionsError)
    }

    // Last 7 days trend
    const { data: last7DaysData, error: trendError } = await supabaseAdmin
      .from('analytics_events')
      .select('created_at, event_name')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (trendError) {
      console.error('[v0] Analytics: Trend error', trendError)
    }

    // Group by date
    const dailyStats: Record<string, { events: number; inquiries: number; conversions: number }> = {}

    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo)
      date.setDate(date.getDate() + i)
      const dateKey = date.toISOString().split('T')[0]
      dailyStats[dateKey] = { events: 0, inquiries: 0, conversions: 0 }
    }

    last7DaysData?.forEach((event) => {
      const dateKey = event.created_at.split('T')[0]
      if (dailyStats[dateKey]) {
        dailyStats[dateKey].events++
        if (event.event_name === 'inquiry_submitted') dailyStats[dateKey].inquiries++
        if (event.event_name === 'payment_completed') dailyStats[dateKey].conversions++
      }
    })

    const last7Days = Object.entries(dailyStats).map(([date, stats]) => ({
      date,
      ...stats,
    }))

    // Top categories (from inquiry properties)
    const { data: inquiryEvents, error: categoriesError } = await supabaseAdmin
      .from('analytics_events')
      .select('properties')
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', sevenDaysAgo.toISOString())

    if (categoriesError) {
      console.error('[v0] Analytics: Categories error', categoriesError)
    }

    const categoryCount: Record<string, number> = {}
    inquiryEvents?.forEach((event) => {
      const category = event.properties?.category
      if (category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1
      }
    })

    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Funnel stats (last 7 days)
    const { count: funnelInquiries, error: funnelInquiriesError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', sevenDaysAgo.toISOString())

    if (funnelInquiriesError) {
      console.error('[v0] Analytics: Funnel inquiries error', funnelInquiriesError)
    }

    const { count: funnelOffers, error: funnelOffersError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'offer_sent')
      .gte('created_at', sevenDaysAgo.toISOString())

    if (funnelOffersError) {
      console.error('[v0] Analytics: Funnel offers error', funnelOffersError)
    }

    const { count: funnelAccepted, error: funnelAcceptedError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'offer_accepted')
      .gte('created_at', sevenDaysAgo.toISOString())

    if (funnelAcceptedError) {
      console.error('[v0] Analytics: Funnel accepted error', funnelAcceptedError)
    }

    const { count: funnelPaid, error: funnelPaidError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'payment_completed')
      .gte('created_at', sevenDaysAgo.toISOString())

    if (funnelPaidError) {
      console.error('[v0] Analytics: Funnel paid error', funnelPaidError)
    }

    // Build response with proper null handling
    return NextResponse.json({
      today: {
        events: todayEvents || 0,
        activeUsers: uniqueActiveUsers || 0,
        inquiries: todayInquiries || 0,
        conversions: todayConversions || 0,
      },
      last7Days,
      topCategories,
      funnel: {
        inquiries: funnelInquiries || 0,
        offers: funnelOffers || 0,
        accepted: funnelAccepted || 0,
        paid: funnelPaid || 0,
      },
    })
  } catch (error) {
    console.error('[v0] Admin Analytics Summary error:', error)
    return NextResponse.json(
      { error: 'Napaka pri pridobivanju podatkov' },
      { status: 500 }
    )
  }
}
