import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { ChevronRight } from 'lucide-react'

export const metadata = {
  title: 'Moja povpraševanja | LiftGO',
  description: 'Pregled vseh vaših povpraševanj',
}

const statusBadgeColors = {
  odprto: 'bg-blue-100 text-blue-800',
  v_teku: 'bg-amber-100 text-amber-800',
  zakljuceno: 'bg-green-100 text-green-800',
  preklicano: 'bg-slate-100 text-slate-800',
}

const urgencyBadgeColors = {
  nujno: 'bg-red-100 text-red-800',
  kmalu: 'bg-orange-100 text-orange-800',
  normalno: 'bg-slate-100 text-slate-800',
}

export default async function InquiriesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/prijava')

  // Fetch all inquiries for this user
  const { data: povprasevanja } = await supabase
    .from('povprasevanja')
    .select(
      `id,
       title,
       category_id,
       location_city,
       created_at,
       status,
       priority,
       ponudbe:ponudbe(count)`
    )
    .eq('narocnik_id', user.id)
    .order('created_at', { ascending: false }) as { data: any[] | null }

  const hasInquiries = (povprasevanja?.length || 0) > 0

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Moja povpraševanja</h1>
        <p className="text-slate-600 mt-2">Pregled vseh vaših povpraševanj in prejete ponudbe</p>
      </div>

      {/* Table */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {!hasInquiries ? (
          <div className="p-6 text-center">
            <p className="text-slate-600 mb-4">Nimate nobenih povpraševanj.</p>
            <Link href="/novo-povprasevanje">
              <button className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Novo povpraševanje
              </button>
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="space-y-3 p-3 md:hidden">
              {povprasevanja?.map((inquiry) => {
                const offerCount = (inquiry.ponudbe as any)?.[0]?.count || 0
                const urgency = inquiry.priority || inquiry.urgency || 'normalno'
                const title = inquiry.title || inquiry.naslov || 'Brez naslova'
                const location = inquiry.location_city || inquiry.lokacija || 'Lokacija ni navedena'

                return (
                  // TODO(route-consolidation): keep legacy detail route until
                  // canonical detail parity is fully validated.
                  <Link
                    key={inquiry.id}
                    href={`/dashboard/stranka/povprasevanja/${inquiry.id}`}
                    className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="min-w-0 truncate font-semibold text-slate-900">{title}</h3>
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-100 px-2 text-xs font-semibold text-blue-700">
                        {offerCount}
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Badge className={statusBadgeColors[inquiry.status as keyof typeof statusBadgeColors]}>
                        {inquiry.status}
                      </Badge>
                      <Badge
                        className={
                          urgencyBadgeColors[urgency as keyof typeof urgencyBadgeColors] ||
                          'bg-slate-100 text-slate-800'
                        }
                      >
                        {urgency}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-600">{location}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(inquiry.created_at).toLocaleDateString('sl-SI')}
                    </p>
                  </Link>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Naslov</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Kategorija</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Lokacija</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Datum</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Nujnost</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Ponudb</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">Akcija</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {povprasevanja?.map((inquiry) => {
                    const offerCount = (inquiry.ponudbe as any)?.[0]?.count || 0
                    const urgency = inquiry.priority || inquiry.urgency || 'normalno'
                    const title = inquiry.title || inquiry.naslov || 'Brez naslova'
                    const location = inquiry.location_city || inquiry.lokacija || 'Lokacija ni navedena'
                    const category = inquiry.category_id || inquiry.kategorija || 'Ni določena'

                    return (
                      <tr
                        key={inquiry.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="max-w-xs truncate px-6 py-4 text-sm font-medium text-slate-900">
                          {title}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600">{category}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">{location}</td>
                        <td className="px-6 py-4 text-sm text-slate-600">
                          {new Date(inquiry.created_at).toLocaleDateString('sl-SI')}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={
                              urgencyBadgeColors[
                                urgency as keyof typeof urgencyBadgeColors
                              ] || 'bg-slate-100 text-slate-800'
                            }
                          >
                            {urgency}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={
                              statusBadgeColors[
                                inquiry.status as keyof typeof statusBadgeColors
                              ]
                            }
                          >
                            {inquiry.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                              {offerCount}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/dashboard/stranka/povprasevanja/${inquiry.id}`}
                            className="inline-flex items-center gap-2 font-medium text-blue-600 transition-colors hover:text-blue-700"
                          >
                            Poglej ponudbe
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
