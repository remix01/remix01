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

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Moja povpraševanja</h1>
        <p className="text-slate-600 mt-2">Pregled vseh vaših povpraševanj in prejete ponudbe</p>
      </div>

      {/* Table */}
      <Card className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {povprasevanja && povprasevanja.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-slate-600 mb-4">Nimate nobenih povpraševanj.</p>
            <Link href="/novo-povprasevanje">
              <button className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Novo povpraševanje
              </button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Naslov
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Kategorija
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Lokacija
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Datum
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Nujnost
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Ponudb
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900">
                    Akcija
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {povprasevanja.map((inquiry) => {
                  const offerCount = (inquiry.ponudbe as any)?.[0]?.count || 0
                  return (
                    <tr
                      key={inquiry.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-900 font-medium max-w-xs truncate">
                        {inquiry.naslov}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {inquiry.kategorija}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {inquiry.lokacija}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        {new Date(inquiry.created_at).toLocaleDateString('sl-SI')}
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            urgencyBadgeColors[
                              inquiry.urgency as keyof typeof urgencyBadgeColors
                            ] || 'bg-slate-100 text-slate-800'
                          }
                        >
                          {inquiry.urgency}
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
                          <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                            {offerCount}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/stranka/povprasevanja/${inquiry.id}`}
                          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
        )}
      </Card>
    </div>
  )
}
