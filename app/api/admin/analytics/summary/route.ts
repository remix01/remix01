import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // Check admin role
    const supabase = await createClient()
    const supabaseAdmin = createAdminClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Neavtoriziran' }, { status: 401 })
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('User')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userData || userData.role !== 'ADMIN') {
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
    const { count: todayEvents } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    const { data: todayActiveUsers } = await supabaseAdmin
      .from('analytics_events')
      .select('user_id')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())
      .not('user_id', 'is', null)

    const uniqueActiveUsers = new Set(
      todayActiveUsers?.map((e) => e.user_id) || []
    ).size

    const { count: todayInquiries } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    const { count: todayConversions } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'payment_completed')
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString())

    // Last 7 days trend
    const { data: last7DaysData } = await supabaseAdmin
      .from('analytics_events')
      .select('created_at, event_name')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

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
    const { data: inquiryEvents } = await supabaseAdmin
      .from('analytics_events')
      .select('properties')
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', sevenDaysAgo.toISOString())

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
    const { count: funnelInquiries } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: funnelOffers } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'offer_sent')
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: funnelAccepted } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'offer_accepted')
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: funnelPaid } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('event_name', 'payment_completed')
      .gte('created_at', sevenDaysAgo.toISOString())

    return NextResponse.json({
      today: {
        events: todayEvents || 0,
        activeUsers: uniqueActiveUsers,
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
    console.error('[Admin Analytics] Summary error:', error)
    return NextResponse.json(
      { error: 'Napaka pri pridobivanju podatkov' },
      { status: 500 }
    )
  }
}
