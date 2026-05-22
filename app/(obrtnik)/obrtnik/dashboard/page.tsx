import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText, Briefcase, Star, TrendingUp, AlertCircle } from 'lucide-react'
import { parseDashboardFilters, serializeDashboardFilters } from '@/lib/dashboard/filters'

export default async function ObrtknikDashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login')
  }

  // Get obrtnik profile
  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('id, business_name')
    .eq('id', user.id)
    .maybeSingle()

  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .maybeSingle()

  if (!obrtnikProfile) {
    redirect('/partner-auth/login')
  }

  const queryErrors: string[] = []
  const filters = parseDashboardFilters(await searchParams)
  const filterQuery = serializeDashboardFilters(filters)

  // Fetch stats
  const { count: activePonudbeCount, error: activeErr } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikProfile.id)
    .in('status', ['poslana', 'sprejeta'])
  if (activeErr) { console.error('[v0] Dashboard active ponudbe error:', activeErr); queryErrors.push('aktivne ponudbe') }

  const { count: acceptedPonudbeCount, error: acceptedErr } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikProfile.id)
    .eq('status', 'sprejeta')
  if (acceptedErr) { console.error('[v0] Dashboard accepted ponudbe error:', acceptedErr); queryErrors.push('sprejete ponudbe') }

  const { data: oceneData, error: oceneErr } = await supabase
    .from('ocene')
    .select('rating')
    .eq('obrtnik_id', obrtnikProfile.id)
  if (oceneErr) { console.error('[v0] Dashboard ocene error:', oceneErr); queryErrors.push('ocene') }

  const averageRating = oceneData && oceneData.length > 0
    ? (oceneData.reduce((sum, o) => sum + o.rating, 0) / oceneData.length).toFixed(1)
    : null

  // Get open povprasevanja count for obrtnik's categories
  const { data: obrtnikCategories, error: catErr } = await supabase
    .from('obrtnik_categories')
    .select('category_id')
    .eq('obrtnik_id', obrtnikProfile.id)
  if (catErr) { console.error('[v0] Dashboard categories error:', catErr); queryErrors.push('kategorije') }

  const categoryIds = obrtnikCategories?.map((oc: { category_id: string }) => oc.category_id) || []

  let openPovprasevanjaCount: number | null = 0
  if (categoryIds.length > 0) {
    const { count, error: povErr } = await supabase
      .from('povprasevanja')
      .select('*', { count: 'exact', head: true })
      .in('category_id', categoryIds)
      .eq('status', 'odprto')
    openPovprasevanjaCount = count
    if (povErr) { console.error('[v0] Dashboard povprasevanja error:', povErr); queryErrors.push('povpraševanja') }
  }

  // Get existing ponudbe to check if any exist
  const { count: existingPonudbeCount, error: existingErr } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikProfile.id)
  if (existingErr) { console.error('[v0] Dashboard existing ponudbe error:', existingErr); queryErrors.push('obstoječe ponudbe') }

  return (
    <div className="space-y-6">
      {/* Header with business name and tier badge */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">LiftGO</h1>
          <p className="text-sm text-muted-foreground">{obrtnikProfile.business_name}</p>
        </div>
        <Badge variant={userProfile?.subscription_tier === 'pro' ? 'default' : 'outline'}>
          {userProfile?.subscription_tier?.toUpperCase() || 'START'}
        </Badge>
      </div>

      {queryErrors.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="text-sm">Nekateri podatki se niso uspeli naložiti. Poskusite osvežiti stran.</p>
        </div>
      )}

      {/* Open povpraševanja banner */}
      {openPovprasevanjaCount && openPovprasevanjaCount > 0 && (
        <Link href={`/obrtnik/povprasevanja?${filterQuery}`}>
          <Card className="p-4 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer">
            <p className="text-sm font-semibold text-primary">
              🔔 {openPovprasevanjaCount} povpraševanj čaka na vašo ponudbo →
            </p>
          </Card>
        </Link>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Aktivne ponudbe</p>
              <p className="text-3xl font-bold text-foreground">
                {activePonudbeCount || 0}
              </p>
              {activePonudbeCount === 0 && existingPonudbeCount === 0 && (
                <p className="text-xs text-primary mt-2 font-semibold">Pošljite prvo ponudbo →</p>
              )}
            </div>
            <Briefcase className="w-12 h-12 text-primary opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Sprejete ponudbe</p>
              <p className="text-3xl font-bold text-foreground">{acceptedPonudbeCount || 0}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-green-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Povprečna ocena</p>
              <p className="text-3xl font-bold text-foreground">{averageRating || 'Brez ocen'}</p>
            </div>
            <Star className="w-12 h-12 text-yellow-500 opacity-20" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Odprta povpraševanja</p>
              <p className="text-3xl font-bold text-foreground">{openPovprasevanjaCount || 0}</p>
            </div>
            <FileText className="w-12 h-12 text-blue-500 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Quick Actions (Mobile Only) */}
      <div className="md:hidden">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Hitre akcije</h2>
        <div className="flex gap-4 overflow-x-auto pb-2">
          <Link href={`/obrtnik/povprasevanja?${filterQuery}`}>
            <Card className="p-6 min-w-[160px] hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Nova<br/>povpraševanja</p>
              </div>
            </Card>
          </Link>

          <Link href={`/obrtnik/ponudbe?${filterQuery}`}>
            <Card className="p-6 min-w-[160px] hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Briefcase className="w-6 h-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Moje<br/>ponudbe</p>
              </div>
            </Card>
          </Link>

          <Link href="/obrtnik/statistike">
            <Card className="p-6 min-w-[160px] hover:shadow-lg transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mb-3">
                  <Star className="w-6 h-6 text-yellow-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">Statistika</p>
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
