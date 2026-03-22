import { supabaseAdmin } from '@/lib/supabase-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getAnalyticsData() {
  try {
    const supabase = createAdminClient()
    
    // Check admin access
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized', status: 401 }
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return { error: 'Forbidden', status: 403 }
    }

    // Fetch all analytics data in parallel
    const [
      revenueData,
      jobsData,
      usersData,
      aiCostData,
      requestsData,
      offersData,
      topUsersData,
    ] = await Promise.all([
      // Monthly revenue from commission logs
      supabaseAdmin
        .from('commission_logs')
        .select('created_at, platform_commission_cents')
        .gte('created_at', new Date(new Date().setDate(1)).toISOString())
        .eq('status', 'transferred'),
      
      // Completed jobs count this month
      supabaseAdmin
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'released')
        .gte('created_at', new Date(new Date().setDate(1)).toISOString()),
      
      // Active PRO users
      supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('subscription_tier', 'pro'),
      
      // AI costs this month
      supabaseAdmin
        .from('profiles')
        .select('ai_total_cost_usd')
        .gte('updated_at', new Date(new Date().setDate(1)).toISOString()),
      
      // Total requests
      supabaseAdmin
        .from('povprasevanja')
        .select('id', { count: 'exact', head: true }),
      
      // Total offers
      supabaseAdmin
        .from('ponudbe')
        .select('id', { count: 'exact', head: true }),
      
      // Top users by revenue
      supabaseAdmin
        .from('profiles')
        .select('id, email, subscription_tier')
        .eq('role', 'partner')
        .order('revenue_generated', { ascending: false })
        .limit(10),
    ])

    // Process revenue chart data (last 30 days)
    const revenueByDate: Record<string, number> = {}
    if (revenueData.data) {
      revenueData.data.forEach((item: any) => {
        const date = new Date(item.created_at).toLocaleDateString('sl-SI')
        const commissionEuros = (item.platform_commission_cents || 0) / 100
        revenueByDate[date] = (revenueByDate[date] || 0) + commissionEuros
      })
    }

    const revenueChart = Object.entries(revenueByDate)
      .map(([date, revenue]) => ({
        date,
        revenue: Math.round(revenue * 100) / 100,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate monthly revenue
    const monthlyRevenue = revenueChart.reduce((sum, item) => sum + item.revenue, 0)

    // Get previous month revenue for comparison
    const prevMonthDate = new Date()
    prevMonthDate.setMonth(prevMonthDate.getMonth() - 1)
    const prevMonthStart = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1)
    const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0)

    const { data: prevRevenueData } = await supabaseAdmin
      .from('commission_logs')
      .select('platform_commission_cents')
      .gte('created_at', prevMonthStart.toISOString())
      .lte('created_at', prevMonthEnd.toISOString())
      .eq('status', 'transferred')

    const prevMonthRevenue = (prevRevenueData || []).reduce(
      (sum: number, item: any) => sum + (item.platform_commission_cents || 0) / 100,
      0
    )

    const monthlyRevenueChange =
      prevMonthRevenue > 0
        ? Math.round(((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
        : monthlyRevenue > 0
        ? 100
        : 0

    // Completed jobs
    const completedJobs = jobsData.count || 0

    // Previous month jobs for comparison
    const { count: prevJobsCount } = await supabaseAdmin
      .from('escrow_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'released')
      .gte('created_at', prevMonthStart.toISOString())
      .lte('created_at', prevMonthEnd.toISOString())

    const prevCount = prevJobsCount ?? 0
    const completedJobsChange =
      prevCount > 0
        ? Math.round(((completedJobs - prevCount) / prevCount) * 100)
        : completedJobs > 0
        ? 100
        : 0

    // Active PRO users
    const activeProUsers = usersData.count || 0

    // Previous month PRO users
    const { data: proUsersHistory } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('subscription_tier', 'pro')
      .lte('updated_at', prevMonthStart.toISOString())

    const proUsersChange =
      (proUsersHistory?.length || 0) > 0
        ? Math.round(((activeProUsers - (proUsersHistory?.length || 0)) / (proUsersHistory?.length || 1)) * 100)
        : activeProUsers > 0
        ? 100
        : 0

    // Conversion rate
    const totalOffers = offersData.count || 0
    const totalRequests = requestsData.count || 0
    const conversionRate =
      totalRequests > 0
        ? Math.round((totalOffers / totalRequests) * 100)
        : 0

    // AI Analytics
    const totalAiCost = (aiCostData.data || []).reduce(
      (sum: number, item: any) => sum + (item.ai_total_cost_usd || 0),
      0
    )

    // Get AI usage by tier
    const { data: proAiUsage } = await supabaseAdmin
      .from('profiles')
      .select('ai_total_cost_usd')
      .eq('subscription_tier', 'pro')

    const proAiCost = (proAiUsage || []).reduce(
      (sum: number, item: any) => sum + (item.ai_total_cost_usd || 0),
      0
    )

    const proUsagePercentage =
      totalAiCost > 0 ? Math.round((proAiCost / totalAiCost) * 100) : 0
    const freeUsagePercentage = 100 - proUsagePercentage

    // Average messages per user (from ai_messages_used_today)
    const { data: messageStats } = await supabaseAdmin
      .from('profiles')
      .select('ai_messages_used_today')
      .gt('ai_messages_used_today', 0)

    const avgMessagesPerUser =
      messageStats && messageStats.length > 0
        ? messageStats.reduce((sum: number, item: any) => sum + (item.ai_messages_used_today || 0), 0) /
          messageStats.length
        : 0

    // Marketplace metrics
    const avgOffersPerRequest =
      totalRequests > 0 ? (totalOffers / totalRequests).toFixed(1) : '0'

    // Acceptance rate (accepted offers / all offers)
    const { count: acceptedOffers } = await supabaseAdmin
      .from('ponudbe')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'accepted')

    const acceptanceRate =
      totalOffers > 0 ? Math.round(((acceptedOffers || 0) / totalOffers) * 100) : 0

    // Top users with detailed stats
    const topUsersList = (topUsersData.data || []).map(async (user: any) => {
      const { count: jobsCompleted } = await supabaseAdmin
        .from('escrow_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('partner_id', user.id)
        .eq('status', 'released')

      const { data: commissionData } = await supabaseAdmin
        .from('commission_logs')
        .select('platform_commission_cents')
        .eq('partner_id', user.id)

      const revenueGenerated = (commissionData || []).reduce(
        (sum: number, item: any) => sum + (item.platform_commission_cents || 0) / 100,
        0
      )

      return {
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier || 'start',
        jobs_completed: jobsCompleted || 0,
        revenue_generated: Math.round(revenueGenerated * 100) / 100,
      }
    })

    const topUsers = await Promise.all(topUsersList)

    return {
      kpis: {
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        completedJobs,
        conversionRate,
        activeProUsers,
        monthlyRevenueChange,
        completedJobsChange,
        proUsersChange,
      },
      revenueChart,
      aiAnalytics: {
        totalAiCost: Math.round(totalAiCost * 100) / 100,
        avgMessagesPerUser: Math.round(avgMessagesPerUser * 10) / 10,
        proUsagePercentage,
        freeUsagePercentage,
      },
      marketplaceMetrics: {
        totalRequests,
        avgOffersPerRequest: parseFloat(avgOffersPerRequest as string),
        acceptanceRate,
        totalOffers,
      },
      topUsers,
    }
  } catch (error) {
    console.error('[v0] Analytics data fetch error:', error)
    throw error
  }
}

export async function GET(request: NextRequest) {
  try {
    const data = await getAnalyticsData()
    
    if ('error' in data) {
      return NextResponse.json(data, { status: data.status })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('[v0] GET /api/admin/analytics error:', error)
    return NextResponse.json(
      { error: 'Napaka pri pridobivanju analitike' },
      { status: 500 }
    )
  }
}
