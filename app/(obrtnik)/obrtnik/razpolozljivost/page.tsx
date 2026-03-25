import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AvailabilityToggleSection } from '@/components/obrtnik/availability-toggle-section'
import { WeeklyScheduleSection } from '@/components/obrtnik/weekly-schedule-section'
import { ServiceAreasSection } from '@/components/obrtnik/service-areas-section'

interface ServiceAreasData {
  id: string
  city: string | null
  region: string | null
  radius_km?: number | null
}

export const metadata = {
  title: 'Razpoložljivost in pokrita območja | LiftGO',
  description: 'Upravljanje vaše razpoložljivosti in pokritih območij',
}

export default async function RazpolozljivostPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/prijava')
  }

  // Get obrtnik profile
  const { data: obrtnikProfile, error: profileError } = await supabase
    .from('obrtnik_profiles')
    .select('id, is_available, response_time_hours')
    .eq('id', user.id)
    .maybeSingle()

  if (!obrtnikProfile || profileError) {
    redirect('/prijava')
  }

  // Fetch availability schedule
  const { data: availabilitySchedule } = await supabase
    .from('obrtnik_availability')
    .select('*')
    .eq('obrtnik_id', obrtnikProfile.id)
    .order('day_of_week')

  // Fetch service areas
  const { data: serviceAreas } = await supabase
    .from('service_areas')
    .select('id, city, region, radius_km')
    .eq('obrtnik_id', obrtnikProfile.id)
    .eq('is_active', true)
    .order('created_at')

  // Enrich service areas with radius_km fallback
  const enrichedServiceAreas: ServiceAreasData[] = (serviceAreas || []).map((area) => ({
    id: area.id,
    city: area.city,
    region: area.region,
    radius_km: (area as any).radius_km ?? 30,
  }))

  return (
    <main className="flex-1 p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Razpoložljivost in pokrita območja</h1>
        <p className="text-slate-600 mt-2">Upravljajte svojo razpoložljivostjo in lokacijo delovanja</p>
      </div>

      {/* Section 1: General Availability */}
      <AvailabilityToggleSection
        obrtnikId={obrtnikProfile.id}
        initialAvailable={obrtnikProfile.is_available || false}
        initialResponseTime={obrtnikProfile.response_time_hours || null}
      />

      {/* Section 2: Weekly Schedule */}
      <WeeklyScheduleSection
        obrtnikId={obrtnikProfile.id}
        initialSchedule={availabilitySchedule ?? []}
      />

      {/* Section 3: Service Areas */}
      <ServiceAreasSection
        obrtnikId={obrtnikProfile.id}
        initialServiceAreas={enrichedServiceAreas}
      />
    </main>
  )
}
