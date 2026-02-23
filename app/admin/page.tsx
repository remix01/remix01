import { prisma } from '@/lib/prisma'
import { StatsCards } from '@/components/admin/StatsCards'
import { ViolationsChart } from '@/components/admin/ViolationsChart'
import { ViolationsByTypeChart } from '@/components/admin/ViolationsByTypeChart'

async function getStats() {
  try {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    violationsToday,
    violationsThisWeek,
    violationsThisMonth,
    blockedMessagesToday,
    highRiskJobs,
    suspendedCraftworkers,
    disputedJobs,
  ] = await Promise.all([
    prisma.violation.count({ where: { createdAt: { gte: today } } }),
    prisma.violation.count({ where: { createdAt: { gte: weekAgo } } }),
    prisma.violation.count({ where: { createdAt: { gte: monthAgo } } }),
    prisma.message.count({ where: { isBlocked: true, sentAt: { gte: today } } }),
    prisma.riskScore.count({ where: { score: { gte: 70 } } }),
    prisma.craftworkerProfile.count({ where: { isSuspended: true } }),
    prisma.job.count({ where: { status: 'DISPUTED' } }),
  ])

  return {
    violationsToday,
    violationsThisWeek,
    violationsThisMonth,
    blockedMessagesToday,
    highRiskJobs,
    suspendedCraftworkers,
    disputedJobs,
  }
  } catch (error) {
    console.error('[v0] Admin stats error:', error)
    return {
      violationsToday: 0,
      violationsThisWeek: 0,
      violationsThisMonth: 0,
      blockedMessagesToday: 0,
      highRiskJobs: 0,
      suspendedCraftworkers: 0,
      disputedJobs: 0,
    }
  }
}

async function getViolationsData() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const violations = await prisma.violation.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: {
        createdAt: true,
        type: true,
      }
    })

    // Group by day
    const byDay: Record<string, number> = {}
    const byType: Record<string, number> = {
      PHONE_DETECTED: 0,
      EMAIL_DETECTED: 0,
      BYPASS_ATTEMPT: 0,
      SUSPICIOUS_PATTERN: 0,
    }

    violations.forEach(v => {
      const date = v.createdAt.toISOString().split('T')[0]
      byDay[date] = (byDay[date] || 0) + 1
      byType[v.type] = (byType[v.type] || 0) + 1
    })

    return { byDay, byType }
  } catch (error) {
    console.error('[v0] Admin violations data error:', error)
    return { byDay: {}, byType: { PHONE_DETECTED: 0, EMAIL_DETECTED: 0, BYPASS_ATTEMPT: 0, SUSPICIOUS_PATTERN: 0 } }
  }
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
