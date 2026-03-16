'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Filter } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Povprasevanje {
  id: string
  title: string
  location_city: string
  urgency: string
  status: string
  created_at: string
  stranka_email: string
  stranka_telefon: string
  category: { name: string } | null
  narocnik: { email: string; full_name: string } | null
}

const statusColors: Record<string, string> = {
  odprto: 'bg-green-100 text-green-800',
  v_teku: 'bg-blue-100 text-blue-800',
  zakljuceno: 'bg-gray-100 text-gray-800',
  preklicano: 'bg-red-100 text-red-800',
}

export default function PovprasevanjaPage() {
  const router = useRouter()
  const [povprasevanja, setPovprasevanja] = useState<Povprasevanje[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('vse')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    const fetchPovprasevanja = async () => {
      const supabase = createClient()
      try {
        setLoading(true)

        // Verify user is authenticated
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/prijava')
          return
        }

        // Build query
        let query = supabase
          .from('povprasevanja')
          .select(`
            id, 
            title, 
            location_city, 
            urgency, 
            status, 
            created_at,
            stranka_email, 
            stranka_telefon,
            category:categories(name),
            narocnik:profiles!povprasevanja_narocnik_id_fkey(email, full_name)
          `, { count: 'exact' })

        // Apply status filter
        if (statusFilter !== 'vse') {
          query = query.eq('status', statusFilter)
        }

        // Apply search filter
        if (search) {
          query = query.or(`title.ilike.%${search}%,location_city.ilike.%${search}%`)
        }

        // Order and paginate
        const { data, count, error: fetchError } = await query
          .order('created_at', { ascending: false })
          .range((page - 1) * 20, page * 20 - 1)

        if (fetchError) {
          console.error('[v0] Fetch error:', fetchError)
          setError(fetchError.message)
          setPovprasevanja([])
          setTotal(0)
          return
        }

        setPovprasevanja(data ?? [])
        setTotal(count ?? 0)
        setError(null)
      } catch (err) {
        console.error('[v0] Error fetching povprasevanja:', err)
        setError(err instanceof Error ? err.message : 'Napaka pri nalaganju')
      } finally {
        setLoading(false)
      }
    }

    fetchPovprasevanja()
  }, [search, statusFilter, page])

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-6 text-3xl font-bold text-foreground">Povpraševanja</h1>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-800">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Iskanje po naslov, lokaciji..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="w-full rounded-lg border border-border bg-card py-2 pl-10 pr-4 text-foreground placeholder-muted-foreground"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => {
              setStatusFilter(e.target.value)
              setPage(1)
            }}
            className="rounded-lg border border-border bg-card px-4 py-2 text-foreground"
          >
            <option value="vse">Vsi statusy</option>
            <option value="odprto">Odprto</option>
            <option value="v_teku">V teku</option>
            <option value="zakljuceno">Zaključeno</option>
            <option value="preklicano">Preklicano</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg bg-card shadow-sm border">
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
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                    Nalagam...
                  </td>
                </tr>
              ) : povprasevanja.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-muted-foreground">
                    Ni povpraševanj
                  </td>
                </tr>
              ) : (
                povprasevanja.map(p => (
                  <tr key={p.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 font-medium text-foreground">{p.title}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.category?.name || '—'}</td>
                    <td className="px-6 py-4 text-muted-foreground">{p.location_city}</td>
                    <td className="px-6 py-4 text-sm">
                      <div className="text-foreground">{p.narocnik?.full_name}</div>
                      <div className="text-xs text-muted-foreground">{p.narocnik?.email}</div>
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
                      <button
                        onClick={() => router.push(`/admin/povprasevanja/${p.id}`)}
                        className="text-primary hover:underline"
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
            <div className="text-sm text-muted-foreground">
              Skupaj: {total} povpraševanj
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="rounded-lg border border-border px-4 py-2 text-foreground disabled:opacity-50 hover:bg-muted"
              >
                Nazaj
              </button>
              <span className="flex items-center px-4 text-foreground">{page}</span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page * 20 >= total}
                className="rounded-lg border border-border px-4 py-2 text-foreground disabled:opacity-50 hover:bg-muted"
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
