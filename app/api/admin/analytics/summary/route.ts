import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

type EventName = 'inquiry_submitted' | 'offer_sent' | 'offer_accepted' | 'payment_completed'

function getDateWindow() {
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)

  const tomorrowStart = new Date(todayStart)
  tomorrowStart.setDate(tomorrowStart.getDate() + 1)

  const sevenDaysAgo = new Date(todayStart)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)

  return { todayStart, tomorrowStart, sevenDaysAgo }
}

async function countAnalyticsEvent(eventName: EventName, fromIso: string, toIso?: string) {
  let query = supabaseAdmin
    .from('analytics_events')
    .select('*', { count: 'exact', head: true })
    .eq('event_name', eventName)
    .gte('created_at', fromIso)

  if (toIso) {
    query = query.lt('created_at', toIso)
  }

  const { count, error } = await query
  if (error) {
    return { count: null as number | null, error }
  }

  return { count: count ?? 0, error: null }
}

async function countFallback(eventName: EventName, fromIso: string, toIso?: string) {
  if (eventName === 'inquiry_submitted') {
    let query = supabaseAdmin
      .from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromIso)

    if (toIso) query = query.lt('created_at', toIso)

    const { count, error } = await query
    if (error) throw error

    return count ?? 0
  }

  if (eventName === 'offer_sent') {
    let query = supabaseAdmin
      .from('ponudbe')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', fromIso)

    if (toIso) query = query.lt('created_at', toIso)

    const { count, error } = await query
    if (error) throw error

    return count ?? 0
  }

  if (eventName === 'offer_accepted') {
    let query = supabaseAdmin
      .from('ponudbe')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .gte('created_at', fromIso)

    if (toIso) query = query.lt('created_at', toIso)

    const { count, error } = await query
    if (error) throw error

    return count ?? 0
  }

  let query = supabaseAdmin
    .from('payment')
    .select('*', { count: 'exact', head: true })
    .in('status', ['RELEASED', 'released', 'transferred'])
    .gte('created_at', fromIso)

  if (toIso) query = query.lt('created_at', toIso)

  const { count, error } = await query
  if (error) throw error

  return count ?? 0
}

async function getCountWithFallback(eventName: EventName, fromIso: string, toIso?: string) {
  const analytics = await countAnalyticsEvent(eventName, fromIso, toIso)
  if (!analytics.error && analytics.count !== null) {
    return { count: analytics.count, source: 'analytics_events' as const }
  }

  const fallbackCount = await countFallback(eventName, fromIso, toIso)
  return { count: fallbackCount, source: 'fallback_tables' as const }
}

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.id) {
      return NextResponse.json({ error: 'Neavtoriziran' }, { status: 401 })
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError) {
      console.error('[admin/analytics/summary] Admin check error:', adminError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!admin) {
      return NextResponse.json({ error: 'Dostop zavrnjen' }, { status: 403 })
    }

    const { todayStart, tomorrowStart, sevenDaysAgo } = getDateWindow()

    const todayInquiries = await getCountWithFallback(
      'inquiry_submitted',
      todayStart.toISOString(),
      tomorrowStart.toISOString()
    )

    const todayConversions = await getCountWithFallback(
      'payment_completed',
      todayStart.toISOString(),
      tomorrowStart.toISOString()
    )

    const funnelInquiries = await getCountWithFallback('inquiry_submitted', sevenDaysAgo.toISOString())
    const funnelOffers = await getCountWithFallback('offer_sent', sevenDaysAgo.toISOString())
    const funnelAccepted = await getCountWithFallback('offer_accepted', sevenDaysAgo.toISOString())
    const funnelPaid = await getCountWithFallback('payment_completed', sevenDaysAgo.toISOString())

    let todayEventsCount = 0
    const { count: rawTodayEvents, error: todayEventsError } = await supabaseAdmin
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', tomorrowStart.toISOString())

    if (todayEventsError) {
      todayEventsCount = todayInquiries.count + funnelOffers.count + todayConversions.count
    } else {
      todayEventsCount = rawTodayEvents ?? 0
    }

    const activeUsersPromise = supabaseAdmin
      .from('analytics_events')
      .select('user_id')
      .gte('created_at', todayStart.toISOString())
      .lt('created_at', tomorrowStart.toISOString())
      .not('user_id', 'is', null)

    const trendPromise = supabaseAdmin
      .from('analytics_events')
      .select('created_at, event_name')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    const categoriesPromise = supabaseAdmin
      .from('analytics_events')
      .select('properties')
      .eq('event_name', 'inquiry_submitted')
      .gte('created_at', sevenDaysAgo.toISOString())

    const [activeUsersRes, trendRes, categoriesRes] = await Promise.all([
      activeUsersPromise,
      trendPromise,
      categoriesPromise,
    ])

    const uniqueActiveUsers = new Set(activeUsersRes.data?.map((e) => e.user_id).filter(Boolean) || []).size

    const dailyStats: Record<string, { events: number; inquiries: number; conversions: number }> = {}

    for (let i = 0; i < 7; i++) {
      const date = new Date(sevenDaysAgo)
      date.setDate(date.getDate() + i)
      const key = date.toISOString().split('T')[0]
      dailyStats[key] = { events: 0, inquiries: 0, conversions: 0 }
    }

    if (!trendRes.error && trendRes.data) {
      trendRes.data.forEach((event) => {
        const key = event.created_at.split('T')[0]
        if (!dailyStats[key]) return

        dailyStats[key].events += 1
        if (event.event_name === 'inquiry_submitted') dailyStats[key].inquiries += 1
        if (event.event_name === 'payment_completed') dailyStats[key].conversions += 1
      })
    } else {
      // Build synthetic trend from core tables if analytics_events is empty/unavailable
      const { data: inquiries } = await supabaseAdmin
        .from('povprasevanja')
        .select('created_at')
        .gte('created_at', sevenDaysAgo.toISOString())

      const { data: payments } = await supabaseAdmin
        .from('payment')
        .select('created_at')
        .in('status', ['RELEASED', 'released', 'transferred'])
        .gte('created_at', sevenDaysAgo.toISOString())

      inquiries?.forEach((row) => {
        const key = row.created_at.split('T')[0]
        if (!dailyStats[key]) return
        dailyStats[key].inquiries += 1
        dailyStats[key].events += 1
      })

      payments?.forEach((row) => {
        const key = row.created_at.split('T')[0]
        if (!dailyStats[key]) return
        dailyStats[key].conversions += 1
        dailyStats[key].events += 1
      })
    }

    const last7Days = Object.entries(dailyStats).map(([date, stats]) => ({ date, ...stats }))

    const categoryCount: Record<string, number> = {}

    if (!categoriesRes.error && categoriesRes.data && categoriesRes.data.length > 0) {
      categoriesRes.data.forEach((event) => {
        const category = event.properties?.category
        if (category) categoryCount[category] = (categoryCount[category] || 0) + 1
      })
    } else {
      const { data: inquiries } = await supabaseAdmin
        .from('povprasevanja')
        .select('kategorija')
        .gte('created_at', sevenDaysAgo.toISOString())

      inquiries?.forEach((row) => {
        const category = row.kategorija || 'Brez kategorije'
        categoryCount[category] = (categoryCount[category] || 0) + 1
      })
    }

    const topCategories = Object.entries(categoryCount)
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    return NextResponse.json({
      today: {
        events: todayEventsCount,
        activeUsers: uniqueActiveUsers,
        inquiries: todayInquiries.count,
        conversions: todayConversions.count,
      },
      last7Days,
      topCategories,
      funnel: {
        inquiries: funnelInquiries.count,
        offers: funnelOffers.count,
        accepted: funnelAccepted.count,
        paid: funnelPaid.count,
      },
      dataSources: {
        inquiries: todayInquiries.source,
        conversions: todayConversions.source,
        funnelInquiries: funnelInquiries.source,
        funnelOffers: funnelOffers.source,
        funnelAccepted: funnelAccepted.source,
        funnelPaid: funnelPaid.source,
        trend: trendRes.error ? 'fallback_tables' : 'analytics_events',
        categories: categoriesRes.error || !categoriesRes.data?.length ? 'fallback_tables' : 'analytics_events',
      },
    })
  } catch (error) {
    console.error('[admin/analytics/summary] Fatal error:', error)
    return NextResponse.json({ error: 'Napaka pri pridobivanju podatkov' }, { status: 500 })
  }
}
