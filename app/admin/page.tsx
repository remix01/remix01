import { supabaseAdmin } from '@/lib/supabase-admin'
import { StatsCards } from '@/components/admin/StatsCards'
import { ViolationsChart } from '@/components/admin/ViolationsChart'
import { ViolationsByTypeChart } from '@/components/admin/ViolationsByTypeChart'
import { AIBriefingCard } from '@/components/admin/AIBriefingCard'
import { AdminAlertsPanel } from '@/components/admin/AdminAlertsPanel'

async function getStats() {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  let totalPartners = 0
  try {
    const { count } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
    totalPartners = count ?? 0
  } catch (e) {
    console.error('[admin] totalPartners query failed:', e instanceof Error ? e.message : String(e))
  }

  let activePartners = 0
  try {
    const { count } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_available', true)
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
      .eq('status', 'odprto')
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
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending')
    pendingVerifications = count ?? 0
  } catch (e) {
    console.error('[admin] pendingVerifications query failed:', e instanceof Error ? e.message : String(e))
  }

  return {
    violationsToday: 0,
    violationsThisWeek: 0,
    violationsThisMonth: 0,
    blockedMessagesToday: 0,
    highRiskJobs: totalPartners,
    suspendedCraftworkers: activePartners,
    disputedJobs: openPovprasevanja,
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
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

  let povprasevanja: any[] = []
  try {
    const { data } = await supabaseAdmin
      .from('povprasevanja')
      .select('created_at')
      .gte('created_at', thirtyDaysAgoStr)
    povprasevanja = data ?? []
  } catch (e) {
    console.error('[admin] povprasevanja query failed:', e instanceof Error ? e.message : String(e))
  }

  // Group by day
  const byDay: Record<string, number> = {}
  const byType: Record<string, number> = {
    'Novo povpraševanje': 0,
    'Sprejeto povpraševanje': 0,
    'Zaključeno povpraševanje': 0,
    'Preklicano povpraševanje': 0,
  }

  povprasevanja.forEach(p => {
    const date = new Date(p.created_at).toISOString().split('T')[0]
    byDay[date] = (byDay[date] || 0) + 1
    byType['Novo povpraševanje'] += 1
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
