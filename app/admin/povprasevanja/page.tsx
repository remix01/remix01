import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DodajPovprasevanjeModal } from '@/components/admin/DodajPovprasevanjeModal'
import { getAdminInquiryFormOptions, getAdminPovprasevanja } from '@/app/admin/actions'

const statusColors: Record<string, string> = {
  odprto: 'bg-green-100 text-green-800',
  v_teku: 'bg-blue-100 text-blue-800',
  zakljuceno: 'bg-gray-100 text-gray-800',
  preklicano: 'bg-red-100 text-red-800',
}

interface PageProps {
  searchParams: Promise<{
    q?: string
    status?: string
    page?: string
  }>
}

function buildQuery(params: { q?: string; status?: string; page?: number }) {
  const usp = new URLSearchParams()
  if (params.q) usp.set('q', params.q)
  if (params.status && params.status !== 'vse') usp.set('status', params.status)
  if (params.page && params.page > 1) usp.set('page', String(params.page))
  const query = usp.toString()
  return query ? `?${query}` : ''
}

export default async function PovprasevanjaPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.q || ''
  const statusFilter = params.status || 'vse'
  const page = Math.max(1, Number(params.page || '1'))

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/prijava')

  const [{ items, total, pageSize }, inquiryOptions] = await Promise.all([
    getAdminPovprasevanja(search, statusFilter, page),
    getAdminInquiryFormOptions(),
  ])
  const hasPrev = page > 1
  const hasNext = page * pageSize < total

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-foreground">Povpraševanja</h1>
          <DodajPovprasevanjeModal
            categories={inquiryOptions.categories}
            customers={inquiryOptions.customers}
          />
        </div>

        <form method="GET" className="mb-6 flex flex-col gap-4 md:flex-row">
          <input
            name="q"
            defaultValue={search}
            type="text"
            placeholder="Iskanje po naslovu, lokaciji..."
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-foreground placeholder-muted-foreground"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-lg border border-border bg-card px-4 py-2 text-foreground"
          >
            <option value="vse">Vsi statusi</option>
            <option value="odprto">Odprto</option>
            <option value="v_teku">V teku</option>
            <option value="zakljuceno">Zaključeno</option>
            <option value="preklicano">Preklicano</option>
          </select>
          <button type="submit" className="rounded-lg border border-border bg-card px-4 py-2 text-foreground hover:bg-muted">
            Filtriraj
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Naslov</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Kategorija</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Lokacija</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Naročnik</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Datum</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                    Ni povpraševanj
                  </td>
                </tr>
              ) : (
                items.map((p) => (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium text-foreground">{p.title}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.category_name}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.location_city}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-foreground">{p.narocnik_name}</div>
                      <div className="text-xs text-muted-foreground">{p.narocnik_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[p.status] || 'bg-gray-100 text-gray-800'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString('sl-SI')}
                    </td>
                    <td className="px-6 py-4">
                      <Link href={`/admin/povprasevanja/${p.id}`} className="text-primary hover:underline">
                        Uredi
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Skupaj: {total} povpraševanj</div>
            <div className="flex gap-2">
              <Link
                href={`/admin/povprasevanja${buildQuery({ q: search, status: statusFilter, page: page - 1 })}`}
                aria-disabled={!hasPrev}
                className={`rounded-lg border border-border px-4 py-2 text-foreground ${!hasPrev ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}`}
              >
                Nazaj
              </Link>
              <span className="flex items-center px-4 text-foreground">{page}</span>
              <Link
                href={`/admin/povprasevanja${buildQuery({ q: search, status: statusFilter, page: page + 1 })}`}
                aria-disabled={!hasNext}
                className={`rounded-lg border border-border px-4 py-2 text-foreground ${!hasNext ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}`}
              >
                Naprej
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
