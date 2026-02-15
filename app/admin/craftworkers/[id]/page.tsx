import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { CraftworkerProfileCard } from '@/components/admin/CraftworkerProfileCard'
import { ActivityTimeline } from '@/components/admin/ActivityTimeline'
import { BypassWarningLog } from '@/components/admin/BypassWarningLog'
import { CommissionHistory } from '@/components/admin/CommissionHistory'
import { SuspensionPanel } from '@/components/admin/SuspensionPanel'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCraftworkerData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      craftworkerProfile: true,
      violations: {
        include: {
          job: true,
          message: true,
        },
        orderBy: { createdAt: 'desc' }
      },
      assignedJobs: {
        include: {
          payment: true,
          customer: true,
        },
        orderBy: { createdAt: 'desc' }
      }
    }
  })

  if (!user || user.role !== 'CRAFTWORKER') {
    return null
  }

  return user
}

export default async function CraftworkerDetailPage({ params }: PageProps) {
  const { id } = await params
  const craftworker = await getCraftworkerData(id)

  if (!craftworker) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">{craftworker.name}</h1>
        <p className="mt-2 text-muted-foreground">Detajlni profil obrtnika</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CraftworkerProfileCard 
          craftworker={craftworker} 
          profile={craftworker.craftworkerProfile!}
        />
        <SuspensionPanel 
          userId={id} 
          isSuspended={craftworker.craftworkerProfile?.isSuspended || false}
          suspendedReason={craftworker.craftworkerProfile?.suspendedReason}
        />
      </div>

      <ActivityTimeline 
        jobs={craftworker.assignedJobs}
        violations={craftworker.violations}
      />

      <BypassWarningLog 
        violations={craftworker.violations}
      />

      <CommissionHistory 
        jobs={craftworker.assignedJobs}
        commissionRate={Number(craftworker.craftworkerProfile?.commissionRate || 0.15)}
      />
    </div>
  )
}
