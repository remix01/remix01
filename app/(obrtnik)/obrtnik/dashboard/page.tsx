import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { FileText, Briefcase, Star, TrendingUp } from 'lucide-react'

export default async function ObrtknikDashboardPage() {
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
    .eq('user_id', user.id)
    .single()

  if (!obrtnikProfile) {
    redirect('/partner-auth/login')
  }

  // Fetch stats
  const { count: activePonudbeCount } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikProfile.id)
    .in('status', ['poslana', 'sprejeta'])

  const { count: acceptedPonudbeCount } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikProfile.id)
    .eq('status', 'sprejeta')

  const { data: oceneData } = await supabase
    .from('ocene')
    .select('rating')
    .eq('obrtnik_id', obrtnikProfile.id)

  const averageRating = oceneData && oceneData.length > 0
    ? (oceneData.reduce((sum, o) => sum + o.rating, 0) / oceneData.length).toFixed(1)
    : '0.0'

  // Get new povprasevanja count (in last 24h)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  
  const { data: obrtnikCategories } = await supabase
    .from('obrtnik_categories')
    .select('category_id')
    .eq('obrtnik_id', obrtnikProfile.id)

  const categoryIds = obrtnikCategories?.map(oc => oc.category_id) || []

  const { count: newPovprasevanjaCount } = await supabase
    .from('povprasevanja')
    .select('*', { count: 'exact', head: true })
    .in('category_id', categoryIds)
    .eq('status', 'odprto')
    .gte('created_at', yesterday.toISOString())

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aktivne ponudbe</p>
              <p className="text-3xl font-bold text-gray-900">{activePonudbeCount || 0}</p>
            </div>
            <Briefcase className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sprejete ponudbe</p>
              <p className="text-3xl font-bold text-gray-900">{acceptedPonudbeCount || 0}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Povprečna ocena</p>
              <p className="text-3xl font-bold text-gray-900">{averageRating}</p>
            </div>
            <Star className="w-12 h-12 text-yellow-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Nova povpraševanja (24h)</p>
              <p className="text-3xl font-bold text-gray-900">{newPovprasevanjaCount || 0}</p>
            </div>
            <FileText className="w-12 h-12 text-purple-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Quick Actions (Mobile Only) */}
      <div className="md:hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hitre akcije</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          <Link href="/obrtnik/povprasevanja">
            <Card className="p-6 min-w-[160px] hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Nova<br/>povpraševanja</p>
              </div>
            </Card>
          </Link>

          <Link href="/obrtnik/ponudbe">
            <Card className="p-6 min-w-[160px] hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Briefcase className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Moje<br/>ponudbe</p>
              </div>
            </Card>
          </Link>

          <Link href="/obrtnik/ocene">
            <Card className="p-6 min-w-[160px] hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Ocene</p>
              </div>
            </Card>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Nedavna aktivnost</h2>
        <p className="text-sm text-gray-600">
          Tukaj boste videli nedavne aktivnosti in obvestila.
        </p>
      </Card>
    </div>
  )
}
