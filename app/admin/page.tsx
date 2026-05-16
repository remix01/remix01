import { supabaseAdmin } from '@/lib/supabase-admin'
import { toLegacyInquiryStatus } from '@/lib/lead-status'
import { StatsCards } from '@/components/admin/StatsCards'
import { ViolationsChart } from '@/components/admin/ViolationsChart'
import { ViolationsByTypeChart } from '@/components/admin/ViolationsByTypeChart'
import { AIBriefingCard } from '@/components/admin/AIBriefingCard'
import { AdminAlertsPanel } from '@/components/admin/AdminAlertsPanel'

async function getStats() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  let totalPartners = 0
  try {
    const { count } = await supabaseAdmin
      .from('craftworker_profile')
      .select('*', { count: 'exact', head: true })
    totalPartners = count ?? 0
  } catch (e) {
    console.error('[admin] totalPartners query failed:', e instanceof Error ? e.message : String(e))
  }

  let activePartners = 0
  try {
    const { count } = await supabaseAdmin
      .from('craftworker_profile')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspended', false)
      .eq('is_verified', true)
    activePartners = count ?? 0
  } catch (e) {
    console.error('[admin] activePartners query failed:', e instanceof Error ? e.message : String(e))
  }

  let totalPovprasevanja = 0
  try {
    const { count } = await supabaseAdmin
      .from('povprasevanja')
      .select('*', { count: 'exact', head: true })
    totalPovprasevanja = count ?? 0
  } catch (e) {
    console.error('[admin] totalPovprasevanja query failed:', e instanceof Error ? e.message : String(e))
  }

  let openPovprasevanja = 0
  try {
    const { count } = await supabaseAdmin
      .from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('status', toLegacyInquiryStatus('new'))
    openPovprasevanja = count ?? 0
  } catch (e) {
    console.error('[admin] openPovprasevanja query failed:', e instanceof Error ? e.message : String(e))
  }

  let totalOcene = 0
  try {
    const { count } = await supabaseAdmin
      .from('ocene')
      .select('*', { count: 'exact', head: true })
    totalOcene = count ?? 0
  } catch (e) {
    console.error('[admin] totalOcene query failed:', e instanceof Error ? e.message : String(e))
  }

  let pendingVerifications = 0
  try {
    const { count } = await supabaseAdmin
      .from('craftworker_profile')
      .select('*', { count: 'exact', head: true })
      .eq('is_verified', false)
    pendingVerifications = count ?? 0
  } catch (e) {
    console.error('[admin] pendingVerifications query failed:', e instanceof Error ? e.message : String(e))
  }

  let violationsToday = 0
  let violationsThisWeek = 0
  let violationsThisMonth = 0
  try {
    const [{ count: todayCount }, { count: weekCount }, { count: monthCount }] = await Promise.all([
      supabaseAdmin.from('violation').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabaseAdmin.from('violation').select('*', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo.toISOString()),
      supabaseAdmin.from('violation').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo.toISOString()),
    ])

    violationsToday = todayCount ?? 0
    violationsThisWeek = weekCount ?? 0
    violationsThisMonth = monthCount ?? 0
  } catch (e) {
    console.error('[admin] violation counters query failed:', e instanceof Error ? e.message : String(e))
  }

  let blockedMessagesToday = 0
  try {
    const { count } = await supabaseAdmin
      .from('message')
      .select('*', { count: 'exact', head: true })
      .eq('is_blocked', true)
      .gte('created_at', today.toISOString())
    blockedMessagesToday = count ?? 0
  } catch (e) {
    console.error('[admin] blocked messages query failed:', e instanceof Error ? e.message : String(e))
  }

  let highRiskJobs = 0
  try {
    const { count } = await supabaseAdmin
      .from('risk_scores')
      .select('*', { count: 'exact', head: true })
      .gte('score', 70)
      .gte('created_at', thirtyDaysAgo.toISOString())
    highRiskJobs = count ?? 0
  } catch (e) {
    console.error('[admin] high-risk jobs query failed:', e instanceof Error ? e.message : String(e))
  }

  let suspendedCraftworkers = 0
  try {
    const { count } = await supabaseAdmin
      .from('craftworker_profile')
      .select('*', { count: 'exact', head: true })
      .eq('is_suspended', true)
    suspendedCraftworkers = count ?? 0
  } catch (e) {
    console.error('[admin] suspended craftworkers query failed:', e instanceof Error ? e.message : String(e))
  }

  let disputedJobs = 0
  try {
    const { count } = await supabaseAdmin
      .from('escrow_disputes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
    disputedJobs = count ?? 0
  } catch (e) {
    console.error('[admin] disputed jobs query failed:', e instanceof Error ? e.message : String(e))
  }

  return {
    violationsToday,
    violationsThisWeek,
    violationsThisMonth,
    blockedMessagesToday,
    highRiskJobs,
    suspendedCraftworkers,
    disputedJobs,
    totalPartners,
    activePartners,
    totalPovprasevanja,
    openPovprasevanja,
    totalOcene,
    pendingVerifications,
  }
}

async function getViolationsData() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  let violations: Array<{ created_at: string; type: string }> = []
  try {
    const { data } = await supabaseAdmin
      .from('violation')
      .select('created_at, type')
      .gte('created_at', thirtyDaysAgo.toISOString())
    violations = (data as Array<{ created_at: string; type: string }> | null) ?? []
  } catch (e) {
    console.error('[admin] violations data query failed:', e instanceof Error ? e.message : String(e))
  }

  const byDay: Record<string, number> = {}
  const byType: Record<string, number> = {}

  violations.forEach((v) => {
    const date = new Date(v.created_at).toISOString().split('T')[0]
    byDay[date] = (byDay[date] || 0) + 1
    byType[v.type] = (byType[v.type] || 0) + 1
  })

  return { byDay, byType }
}

export default async function AdminOverviewPage() {
  const [stats, chartsData] = await Promise.all([
    getStats(),
    getViolationsData()
  ])

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Overview</h1>
        <p className="mt-2 text-muted-foreground">
          System-wide monitoring and violation tracking
        </p>
      </div>

      <StatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <AIBriefingCard />
        <AdminAlertsPanel />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ViolationsChart data={chartsData.byDay} />
        <ViolationsByTypeChart data={chartsData.byType} />
      </div>
    </div>
  )
}
