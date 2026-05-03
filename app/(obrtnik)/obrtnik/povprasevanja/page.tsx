import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOpenPovprasevanjaForObrtnik } from '@/lib/dal/povprasevanja'
import { PovprasevanjaList } from '@/components/obrtnik/povprasevanja-list'

export default async function ObrtknikPovprasevanjaPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/prijava')
  }

  // Get obrtnik profile
  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (!obrtnikProfile) {
    redirect('/prijava')
  }

  // Get obrtnik categories separately
  const { data: obrtnikCats } = await supabase
    .from('obrtnik_categories')
    .select('category_id')
    .eq('obrtnik_id', obrtnikProfile.id)

  const categoryIds = obrtnikCats?.map((oc) => oc.category_id) || []

  // Fetch open povprasevanja in obrtnik's categories
  const povprasevanja = await getOpenPovprasevanjaForObrtnik(obrtnikProfile.id, categoryIds)

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
