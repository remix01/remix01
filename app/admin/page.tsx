import { createClient } from '@/lib/supabase/server'
import { StatsCards } from '@/components/admin/StatsCards'
import { ViolationsChart } from '@/components/admin/ViolationsChart'
import { ViolationsByTypeChart } from '@/components/admin/ViolationsByTypeChart'

async function getStats() {
  const supabase = await createClient()
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const todayStr = today.toISOString()
  const weekAgoStr = weekAgo.toISOString()
  const monthAgoStr = monthAgo.toISOString()

  const [
    { count: totalPartners },
    { count: activePartners },
    { count: totalPovprasevanja },
    { count: openPovprasevanja },
    { count: totalOcene },
    { count: pendingVerifications },
  ] = await Promise.all([
    supabase
      .from('partners')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('partners')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('povprasevanja')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'odprto'),
    supabase
      .from('ocene')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('obrtnik_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),
  ])

  return {
    violationsToday: 0,
    violationsThisWeek: 0,
    violationsThisMonth: 0,
    blockedMessagesToday: 0,
    highRiskJobs: totalPartners || 0,
    suspendedCraftworkers: activePartners || 0,
    disputedJobs: openPovprasevanja || 0,
    totalPartners,
    activePartners,
    totalPovprasevanja,
    openPovprasevanja,
    totalOcene,
    pendingVerifications,
  }
}

async function getViolationsData() {
  const supabase = await createClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString()

  const { data: povprasevanja } = await supabase
    .from('povprasevanja')
    .select('created_at')
    .gte('created_at', thirtyDaysAgoStr)

  // Group by day
  const byDay: Record<string, number> = {}
  const byType: Record<string, number> = {
    'Novo povpraševanje': 0,
    'Sprejeto povpraševanje': 0,
    'Zaključeno povpraševanje': 0,
    'Preklicano povpraševanje': 0,
  }

  povprasevanja?.forEach(p => {
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
        <ViolationsChart data={chartsData.byDay} />
        <ViolationsByTypeChart data={chartsData.byType} />
      </div>
    </div>
  )
}
