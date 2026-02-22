import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getOpenPovprasevanjaForObrtnik } from '@/lib/dal/povprasevanja'
import { PovprasevanjaList } from '@/components/obrtnik/povprasevanja-list'

export default async function ObrtknikPovprasevanjaPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login')
  }

  // Get obrtnik profile with categories
  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select(`
      *,
      obrtnik_categories(category_id)
    `)
    .eq('user_id', user.id)
    .single()

  if (!obrtnikProfile) {
    redirect('/partner-auth/login')
  }

  const categoryIds = obrtnikProfile.obrtnik_categories?.map((oc: any) => oc.category_id) || []

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
