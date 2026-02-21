import { createClient } from '@/lib/supabase/server'
import { RiskAlertCard } from '@/components/admin/RiskAlertCard'

async function getHighRiskJobs() {
  const supabase = await createClient()
  
  const { data: jobs } = await supabase
    .from('povprasevanja')
    .select(`
      *,
      profiles:narocnik_id(full_name, location_city),
      categories:category_id(name)
    `)
    .eq('urgency', 'nujno')
    .order('created_at', { ascending: false })

  return jobs || []
}

export default async function RiskAlertsPage() {
  const jobs = await getHighRiskJobs()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Risk Alerts</h1>
        <p className="mt-2 text-muted-foreground">
          Jobs with urgent priority requiring attention
        </p>
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          No high-risk jobs at the moment
        </div>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job: any) => (
            <RiskAlertCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}

