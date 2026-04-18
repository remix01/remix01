import Link from 'next/link'
import { getAdminOffers } from '@/app/admin/actions'

const statusColors: Record<string, string> = {
  osnutek: 'bg-gray-100 text-gray-800',
  poslano: 'bg-blue-100 text-blue-800',
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  sprejeta: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  zavrnjena: 'bg-red-100 text-red-800',
  expired: 'bg-orange-100 text-orange-800',
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

function formatAmount(value: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${value.toLocaleString('sl-SI')} €`
}

export default async function AdminOffersPage({ searchParams }: PageProps) {
  const params = await searchParams
  const search = params.q || ''
  const statusFilter = params.status || 'vse'
  const page = Math.max(1, Number(params.page || '1'))
  const { items, total, pageSize } = await getAdminOffers(search, statusFilter, page)
  const hasPrev = page > 1
  const hasNext = page * pageSize < total

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Ponudbe</h1>
            <p className="mt-2 text-sm text-muted-foreground">Pregled vseh oddanih ponudb in njihovega statusa.</p>
          </div>
        </div>

        <form method="GET" className="mb-6 flex flex-col gap-4 md:flex-row">
          <input
            name="q"
            defaultValue={search}
            type="text"
            placeholder="Iskanje po sporočilu..."
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-foreground placeholder-muted-foreground"
          />
          <select
            name="status"
            defaultValue={statusFilter}
            className="rounded-lg border border-border bg-card px-4 py-2 text-foreground"
          >
            <option value="vse">Vsi statusi</option>
            <option value="osnutek">Osnutek</option>
            <option value="poslano">Poslano</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="sprejeta">Sprejeta</option>
            <option value="rejected">Rejected</option>
            <option value="zavrnjena">Zavrnjena</option>
            <option value="expired">Expired</option>
          </select>
          <button type="submit" className="rounded-lg border border-border bg-card px-4 py-2 text-foreground hover:bg-muted">
            Filtriraj
          </button>
        </form>

        <div className="overflow-x-auto rounded-lg border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Ponudba</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Povpraševanje</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Partner</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Cena</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                <th className="px-6 py-3 text-left font-semibold text-foreground">Datum</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-muted-foreground">
                    Ni ponudb za izbrane filtre.
                  </td>
                </tr>
              ) : (
                items.map((offer) => (
                  <tr key={offer.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{offer.id.slice(0, 8)}...</div>
                      <div className="line-clamp-2 text-xs text-muted-foreground">{offer.message || 'Brez opisa'}</div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-foreground">{offer.inquiry_title}</div>
                      <div className="text-xs text-muted-foreground">{offer.inquiry_city}</div>
                      <Link href={`/admin/povprasevanja/${offer.inquiry_id}`} className="text-xs text-primary hover:underline">
                        Odpri povpraševanje
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">{offer.partner_name}</td>
                    <td className="px-6 py-4 text-foreground">{formatAmount(offer.amount)}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColors[offer.status] || 'bg-gray-100 text-gray-800'}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {offer.created_at ? new Date(offer.created_at).toLocaleDateString('sl-SI') : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > pageSize && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Skupaj: {total} ponudb</div>
            <div className="flex gap-2">
              <Link
                href={`/admin/offers${buildQuery({ q: search, status: statusFilter, page: page - 1 })}`}
                aria-disabled={!hasPrev}
                className={`rounded-lg border border-border px-4 py-2 text-foreground ${!hasPrev ? 'pointer-events-none opacity-50' : 'hover:bg-muted'}`}
              >
                Nazaj
              </Link>
              <span className="flex items-center px-4 text-foreground">{page}</span>
              <Link
                href={`/admin/offers${buildQuery({ q: search, status: statusFilter, page: page + 1 })}`}
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
