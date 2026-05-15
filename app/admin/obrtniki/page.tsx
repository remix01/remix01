import Link from 'next/link'
import { CheckCircle, XCircle, Clock, Eye } from 'lucide-react'
import { getPartnerji } from '../actions'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>
}

const statusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  AKTIVEN: {
    label: 'Verificiran',
    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    color: 'bg-green-100 text-green-800',
  },
  PENDING: {
    label: 'Čaka',
    icon: <Clock className="h-4 w-4 text-yellow-500" />,
    color: 'bg-yellow-100 text-yellow-800',
  },
  SUSPENDIRAN: {
    label: 'Suspendiran',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    color: 'bg-red-100 text-red-800',
  },
}

export default async function ObrtnikiPage({ searchParams }: PageProps) {
  const params = await searchParams
  const statusFilter = params.status || ''
  const page = Math.max(1, Number(params.page || '1'))

  const { partnerji, total, pages } = await getPartnerji(
    undefined,
    statusFilter || undefined,
    'createdAt',
    page,
    50,
  )

  const hasPrev = page > 1
  const hasNext = page < pages

  function buildQuery(overrides: { status?: string; page?: number }) {
    const usp = new URLSearchParams()
    const s = overrides.status !== undefined ? overrides.status : statusFilter
    const p = overrides.page !== undefined ? overrides.page : page
    if (s) usp.set('status', s)
    if (p > 1) usp.set('page', String(p))
    const q = usp.toString()
    return q ? `?${q}` : ''
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Obrtniki</h1>
          <p className="text-muted-foreground">
            Pregled, verifikacija in moderacija obrtniških računov.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">{total} skupaj</span>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { value: '', label: 'Vsi' },
          { value: 'PENDING', label: 'Čakajoči' },
          { value: 'AKTIVEN', label: 'Verificirani' },
          { value: 'SUSPENDIRAN', label: 'Suspendirani' },
        ].map((tab) => (
          <Link
            key={tab.value}
            href={`/admin/obrtniki${buildQuery({ status: tab.value, page: 1 })}`}
            className={`rounded-lg px-4 py-2 text-sm transition ${
              statusFilter === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-card text-foreground border hover:bg-muted'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Podjetje</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Email</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Kategorija</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Ocena</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Registriran</th>
              <th className="px-6 py-3 text-left font-semibold text-foreground">Akcije</th>
            </tr>
          </thead>
          <tbody>
            {partnerji.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  Ni obrtnikov za izbran filter.
                </td>
              </tr>
            ) : (
              partnerji.map((o) => {
                const cfg = statusConfig[o.status] ?? {
                  label: o.status,
                  icon: null,
                  color: 'bg-gray-100 text-gray-800',
                }
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-6 py-4 font-medium text-foreground">{o.ime || '—'}</td>
                    <td className="px-6 py-4 text-foreground">{o.email}</td>
                    <td className="px-6 py-4 text-muted-foreground">{o.tip}</td>
                    <td className="px-6 py-4">
                      <span className="font-medium">{o.ocena.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {cfg.icon}
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-medium ${cfg.color}`}
                        >
                          {cfg.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {new Date(o.createdAt).toLocaleDateString('sl-SI')}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/partnerji/${o.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        <Eye className="h-4 w-4" />
                        Upravljaj
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Stran {page} od {pages}
          </span>
          <div className="flex gap-2">
            <Link
              href={`/admin/obrtniki${buildQuery({ page: page - 1 })}`}
              aria-disabled={!hasPrev}
              className={`rounded-lg border px-4 py-2 text-sm text-foreground ${
                !hasPrev ? 'pointer-events-none opacity-50' : 'hover:bg-muted'
              }`}
            >
              Prejšnja
            </Link>
            <Link
              href={`/admin/obrtniki${buildQuery({ page: page + 1 })}`}
              aria-disabled={!hasNext}
              className={`rounded-lg border px-4 py-2 text-sm text-foreground ${
                !hasNext ? 'pointer-events-none opacity-50' : 'hover:bg-muted'
              }`}
            >
              Naslednja
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
