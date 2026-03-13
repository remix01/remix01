import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { TrendingUp, Send, CheckCircle, Star } from 'lucide-react'

export default async function StatistikePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/partner-auth/login')
  }

  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!obrtnikProfile) {
    redirect('/partner-auth/login')
  }

  // Fetch stats
  const { count: allPonudbeCount } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikProfile.id)

  const thisMonth = new Date()
  thisMonth.setDate(1)

  const { count: monthPonudbeCount } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikProfile.id)
    .gte('created_at', thisMonth.toISOString())

  const { count: acceptedCount } = await supabase
    .from('ponudbe')
    .select('*', { count: 'exact', head: true })
    .eq('obrtnik_id', obrtnikProfile.id)
    .eq('status', 'sprejeta')

  const conversionRate = allPonudbeCount ? Math.round((acceptedCount || 0) / allPonudbeCount * 100) : 0

  const { data: oceneData } = await supabase
    .from('ocene')
    .select('rating')
    .eq('obrtnik_id', obrtnikProfile.id)

  const avgRating = oceneData && oceneData.length > 0
    ? (oceneData.reduce((s, o) => s + o.rating, 0) / oceneData.length).toFixed(1)
    : '0.0'

  // Total earned
  const { data: paidOffers } = await supabase
    .from('ponudbe')
    .select('price_estimate')
    .eq('obrtnik_id', obrtnikProfile.id)
    .eq('status', 'sprejeta')

  const totalEarned = paidOffers?.reduce((s, p) => s + (p.price_estimate || 0), 0) || 0

  // Last 30 days data for bar chart
  const last30Days = new Array(30).fill(0).map((_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return date.toISOString().split('T')[0]
  })

  const { data: last30Offers } = await supabase
    .from('ponudbe')
    .select('created_at')
    .eq('obrtnik_id', obrtnikProfile.id)
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

  const dailyCounts = last30Days.map(date => {
    return (last30Offers || []).filter(o => o.created_at.startsWith(date)).length
  })

  const maxCount = Math.max(...dailyCounts, 1)

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-8">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Statistike</h1>
        <p className="text-gray-600 mb-8">Pregled vaše dejavnosti in uspešnosti</p>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Poslane ponudbe</p>
                <p className="text-3xl font-bold text-gray-900">{allPonudbeCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">v tem mesecu: {monthPonudbeCount || 0}</p>
              </div>
              <Send className="w-12 h-12 text-blue-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Sprejete ponudbe</p>
                <p className="text-3xl font-bold text-gray-900">{acceptedCount || 0}</p>
                <p className="text-xs text-gray-500 mt-1">{conversionRate}% konverzije</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Povprečna ocena</p>
                <p className="text-3xl font-bold text-gray-900">{avgRating}</p>
                <p className="text-xs text-gray-500 mt-1">({oceneData?.length || 0} ocen)</p>
              </div>
              <Star className="w-12 h-12 text-yellow-500 opacity-20" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Skupaj zasluženo</p>
                <p className="text-3xl font-bold text-gray-900">€{totalEarned.toLocaleString('sl-SI')}</p>
                <p className="text-xs text-gray-500 mt-1">od sprejetih ponudb</p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-500 opacity-20" />
            </div>
          </Card>
        </div>

        {/* 30-Day Chart */}
        <Card className="p-6">
          <h2 className="font-bold text-lg mb-4">Ponudbe zadnjih 30 dni</h2>
          <div className="flex items-end gap-1 h-64 bg-gray-50 p-4 rounded-lg overflow-x-auto">
            {dailyCounts.map((count, i) => (
              <div key={i} className="flex flex-col items-center flex-1 min-w-12">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-sm"
                  style={{
                    height: maxCount > 0 ? `${(count / maxCount) * 100}%` : '0%',
                    minHeight: count > 0 ? '4px' : '0px',
                  }}
                  title={`${last30Days[i]}: ${count}`}
                />
                <p className="text-xs text-gray-500 mt-2">{last30Days[i].slice(5)}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">Vrstni red: 30 dni nazaj → danes</p>
        </Card>
      </div>
    </div>
  )
}
