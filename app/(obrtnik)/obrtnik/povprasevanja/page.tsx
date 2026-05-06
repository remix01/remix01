import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOpenPovprasevanjaForObrtnik } from '@/lib/dal/povprasevanja'
import { PovprasevanjaList } from '@/components/obrtnik/povprasevanja-list'
import { FUNNEL_EVENTS, trackFunnelEvent } from '@/lib/analytics/funnel'

export default async function ObrtknikPovprasevanjaPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login')
  }

  // Get obrtnik profile
  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!obrtnikProfile) {
    redirect('/partner-auth/login')
  }

  // Get obrtnik categories separately
  const { data: obrtnikCats } = await supabase
    .from('obrtnik_categories')
    .select('category_id')
    .eq('obrtnik_id', obrtnikProfile.id)

  const categoryIds = obrtnikCats?.map((oc) => oc.category_id) || []

  // Fetch open povprasevanja in obrtnik's categories
  const povprasevanja = await getOpenPovprasevanjaForObrtnik(obrtnikProfile.id, categoryIds)
  trackFunnelEvent(FUNNEL_EVENTS.PARTNER_INQUIRY_OPENED, {
    user_type: 'obrtnik',
    obrtnik_id: obrtnikProfile.id,
    timestamp: new Date().toISOString(),
  }, user.id)

  // Fetch categories for filter
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .in('id', categoryIds)
    .order('name')

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <PovprasevanjaList
        povprasevanja={povprasevanja}
        categories={categories || []}
        obrtnikId={obrtnikProfile.id}
      />
    </div>
  )
}
