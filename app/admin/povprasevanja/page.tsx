'use client'

import { useEffect, useState } from 'react'
import { Search, Filter, Download } from 'lucide-react'

interface Povprasevanje {
  id: string
  storitev: string
  lokacija: string
  stranka_ime: string
  stranka_email: string
  stranka_telefon: string
  status: string
  termin_datum: string
  termin_ura: string
  obrtniki: { ime: string; priimek: string; email: string } | null
  admin_opomba: string
}

const statusColors: Record<string, string> = {
  novo: 'bg-yellow-100 text-yellow-800',
  dodeljeno: 'bg-blue-100 text-blue-800',
  sprejeto: 'bg-green-100 text-green-800',
  zavrnjeno: 'bg-red-100 text-red-800',
  v_izvajanju: 'bg-purple-100 text-purple-800',
  zakljuceno: 'bg-green-100 text-green-800',
  preklicano: 'bg-gray-100 text-gray-800',
}

export default function PovprasevanjaPage() {
  const [povprasevanja, setPovprasevanja] = useState<Povprasevanje[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('vse')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchPovprasevanja = async () => {
      try {
        const token = localStorage.getItem('sb-token')
        const params = new URLSearchParams({
          page: page.toString(),
          limit: '20',
          ...(search && { search }),
          ...(statusFilter !== 'vse' && { status: statusFilter }),
        })
        const response = await fetch(`/api/povprasevanje?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        setPovprasevanja(data.data)
        setTotal(data.count)
      } catch (error) {
        console.error('[v0] Error fetching povprasevanja:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchPovprasevanja()
  }, [search, statusFilter, page])

  return (
    <div className="min-h-screen bg-bg-muted p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-text-foreground">Povpraševanja</h1>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-text-muted-foreground" />
            <input
              type="text"
              placeholder="Iskanje po imenu, storitvi, lokaciji..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-border-border bg-white py-2 pl-10 pr-4 text-text-foreground placeholder-text-muted-foreground"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-border-border bg-white px-4 py-2 text-text-foreground"
          >
            <option value="vse">Vsi statusy</option>
            <option value="novo">Novo</option>
            <option value="dodeljeno">Dodeljeno</option>
            <option value="sprejeto">Sprejeto</option>
            <option value="v_izvajanju">V izvajanju</option>
            <option value="zakljuceno">Zaključeno</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b border-border-border bg-bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Storitev</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Stranka</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Obrtnik</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Termin</th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-text-foreground">Akcije</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-text-muted-foreground">
                    Nalagam...
                  </td>
                </tr>
              ) : povprasevanja.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-text-muted-foreground">
                    Ni povprasevanj
                  </td>
                </tr>
              ) : (
                povprasevanja.map(p => (
                  <tr key={p.id} className="border-b border-border-border hover:bg-bg-muted">
                    <td className="px-6 py-4 text-sm text-text-foreground">{p.storitev}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-text-foreground">{p.stranka_ime}</div>
                      <div className="text-xs text-text-muted-foreground">{p.stranka_email}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-foreground">
                      {p.obrtniki ? `${p.obrtniki.ime} ${p.obrtniki.priimek}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[p.status] || 'bg-gray-100'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-text-foreground">
                      {p.termin_datum ? `${p.termin_datum} ${p.termin_ura}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => window.location.href = `/admin/povprasevanja/${p.id}`}
                        className="text-text-primary hover:underline"
                      >
                        Uredi
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-text-muted-foreground">
              Skupaj: {total} povprasevanj
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border-border px-4 py-2 text-text-foreground disabled:opacity-50"
              >
                Nazaj
              </button>
              <span className="flex items-center px-4">{page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * 20 >= total}
                className="rounded-lg border border-border-border px-4 py-2 text-text-foreground disabled:opacity-50"
              >
                Naprej
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
