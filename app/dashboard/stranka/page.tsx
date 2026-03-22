import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { FileText, Clock, CheckCircle, AlertCircle } from 'lucide-react'

export const metadata = {
  title: 'Nadzorna plošča | LiftGO',
  description: 'Vaša nadzorna plošča z pregledom povpraševanj in ponudb',
}

const statusBadgeColors = {
  odprto: 'bg-blue-100 text-blue-800',
  v_teku: 'bg-amber-100 text-amber-800',
  zakljuceno: 'bg-green-100 text-green-800',
  preklicano: 'bg-slate-100 text-slate-800',
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/prijava')

  // Fetch stats
  const { data: povprasevanja } = await supabase
    .from('povprasevanja')
    .select('id, title, category_id, location_city, created_at, status')
    .eq('narocnik_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50) as { data: any[] | null }

  // Calculate stats
  const stats = {
    skupaj: povprasevanja?.length || 0,
    odprto: povprasevanja?.filter((p) => p.status === 'odprto').length || 0,
    v_teku: povprasevanja?.filter((p) => p.status === 'v_teku').length || 0,
    zakljuceno: povprasevanja?.filter((p) => p.status === 'zakljuceno').length || 0,
  }

  const recentInquiries = povprasevanja?.slice(0, 5) || []

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Pregled</h1>
        <p className="text-slate-600 mt-2">Dobrodošli! Tukaj je pregled vaših povpraševanj in odzivov.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Skupaj povpraševanj */}
        <Card className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Skupaj povpraševanj</p>
              <p className="text-4xl font-bold text-slate-900 mt-2">{stats.skupaj}</p>
            </div>
            <FileText className="w-12 h-12 text-blue-100" />
          </div>
        </Card>

        {/* Odprta */}
        <Card className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Odprta</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-blue-100 text-blue-800 text-lg px-3 py-1">
                  {stats.odprto}
                </Badge>
              </div>
            </div>
            <AlertCircle className="w-12 h-12 text-blue-100" />
          </div>
        </Card>

        {/* V teku */}
        <Card className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">V teku</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-amber-100 text-amber-800 text-lg px-3 py-1">
                  {stats.v_teku}
                </Badge>
              </div>
            </div>
            <Clock className="w-12 h-12 text-amber-100" />
          </div>
        </Card>

        {/* Zaključena */}
        <Card className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-medium">Zaključena</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className="bg-green-100 text-green-800 text-lg px-3 py-1">
                  {stats.zakljuceno}
                </Badge>
              </div>
            </div>
            <CheckCircle className="w-12 h-12 text-green-100" />
          </div>
        </Card>
      </div>

      {/* Recent Inquiries */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Zadnja povpraševanja</h2>
        </div>

        {recentInquiries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-600 mb-4">Nimate nobenih povpraševanj.</p>
            <Link href="/novo-povprasevanje">
              <button className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Novo povpraševanje
              </button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {recentInquiries.map((inquiry) => (
              <Link
                key={inquiry.id}
                href={`/dashboard/stranka/povprasevanja/${inquiry.id}`}
                className="block p-6 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="font-semibold text-slate-900 truncate">
                        {inquiry.naslov}
                      </h3>
                      <Badge className={statusBadgeColors[inquiry.status as keyof typeof statusBadgeColors]}>
                        {inquiry.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600 truncate">{inquiry.kategorija}</p>
                    <p className="text-sm text-slate-500 mt-1">{inquiry.lokacija}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-slate-900">
                      €{inquiry.budget_od}–€{inquiry.budget_do}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(inquiry.created_at).toLocaleDateString('sl-SI')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
