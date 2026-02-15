import { prisma } from '@/lib/prisma'
import { RiskAlertCard } from '@/components/admin/RiskAlertCard'

async function getHighRiskJobs() {
  const jobs = await prisma.job.findMany({
    where: {
      riskScore: {
        score: { gte: 60 }
      }
    },
    include: {
      customer: {
        select: { id: true, name: true, email: true }
      },
      craftworker: {
        select: { id: true, name: true, email: true }
      },
      riskScore: true,
      payment: {
        select: { amount: true, status: true }
      }
    },
    orderBy: {
      riskScore: {
        score: 'desc'
      }
    }
  })

  return jobs
}

export default async function RiskAlertsPage() {
  const jobs = await getHighRiskJobs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Risk Alerts</h1>
        <p className="mt-2 text-muted-foreground">
          Jobs with risk score ≥ 60 requiring attention
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No high-risk jobs at the moment
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <RiskAlertCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}
