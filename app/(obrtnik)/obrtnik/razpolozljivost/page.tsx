import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { AvailabilityToggleSection } from '@/components/obrtnik/availability-toggle-section'
import { WeeklyScheduleSection } from '@/components/obrtnik/weekly-schedule-section'
import { ServiceAreasSection } from '@/components/obrtnik/service-areas-section'
import type { ServiceAreaRow, ServiceAreaDisplay } from '@/lib/types'
import { toServiceAreaDisplayList } from '@/lib/types'

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
  const { data: scheduleData } = await supabase
    .from('obrtnik_availability')
    .select('*')
    .eq('obrtnik_id', obrtnikProfile.id)
    .order('day_of_week')

  // Map schedule to ensure all required fields have defaults
  const availabilitySchedule = scheduleData?.map(item => ({
    ...item,
    is_available: item.is_available ?? false,
  })) || null

  // Fetch service areas
  const { data: serviceAreasRaw } = await supabase
    .from('service_areas')
    .select('id, obrtnik_id, city, region, radius_km, lat, lng, is_active, created_at')
    .eq('obrtnik_id', obrtnikProfile.id)
    .eq('is_active', true)
    .order('created_at')
    .returns<ServiceAreaRow[]>()

  const serviceAreas: ServiceAreaDisplay[] = toServiceAreaDisplayList(serviceAreasRaw)

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
        initialServiceAreas={serviceAreas}
      />
    </main>
  )
}
