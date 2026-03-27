import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CraftworkerProfileCard } from '@/components/admin/CraftworkerProfileCard'
import { ActivityTimeline } from '@/components/admin/ActivityTimeline'
import { BypassWarningLog } from '@/components/admin/BypassWarningLog'
import { CommissionHistory } from '@/components/admin/CommissionHistory'
import { SuspensionPanel } from '@/components/admin/SuspensionPanel'

interface PageProps {
  params: Promise<{ id: string }>
}

async function getCraftworkerData(userId: string) {
  const supabase = await createClient()
  
  const { data: craftworker } = await supabase
    .from('obrtnik_profiles')
    .select(`
      *,
      profiles:id(email, phone, full_name)
    `)
    .eq('id', userId)
    .maybeSingle()

  if (!craftworker) {
    return null
  }

  // Fetch related povprasevanja (jobs)
  const { data: povprasevanja } = await supabase
    .from('povprasevanja')
    .select('*')
    .eq('obrtnik_id', userId)
    .order('created_at', { ascending: false })

  // Fetch related ocene (reviews)
  const { data: ocene } = await supabase
    .from('ocene')
    .select('*')
    .eq('obrtnik_id', userId)
    .order('created_at', { ascending: false })

  return {
    ...craftworker,
    email: craftworker.profiles?.email,
    phone: craftworker.profiles?.phone,
    assignedJobs: povprasevanja || [],
    violations: [],
    reviews: ocene || [],
  }
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
        <h1 className="text-3xl font-bold text-foreground">{craftworker.business_name}</h1>
        <p className="mt-2 text-muted-foreground">Detajlni profil obrtnika</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CraftworkerProfileCard
          craftworker={{
            name: craftworker.business_name || '',
            email: '',
            phone: null,
          }}
          profile={{
            packageType: craftworker.subscription_tier || 'start',
            stripeAccountId: craftworker.stripe_customer_id || null,
            stripeOnboardingComplete: !!craftworker.stripe_customer_id,
            totalJobsCompleted: craftworker.assignedJobs?.length || 0,
            avgRating: craftworker.avg_rating,
            loyaltyPoints: 0,
            isVerified: craftworker.is_verified || false,
          }}
        />
        <SuspensionPanel 
          userId={id} 
          isSuspended={craftworker.is_available === false}
          suspendedReason={null}
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
        commissionRate={0.15}
      />
    </div>
  )
}

