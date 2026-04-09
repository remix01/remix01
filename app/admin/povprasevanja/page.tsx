import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

const PAGE_SIZE = 20

export default async function AdminPovprasevanjaPage({ searchParams }: PageProps) {
  const { search = '', status = 'vse', page: pageParam = '1' } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from('povprasevanja')
    .select(`
      id,
      title,
      location_city,
      urgency,
      status,
      created_at,
      categories(name),
      profiles!povprasevanja_narocnik_id_fkey(email, full_name)
    `, { count: 'exact' })

  if (status !== 'vse') {
    query = query.eq('status', status)
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,location_city.ilike.%${search}%`)
  }

  const { data, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Povpraševanja ni mogoče naložiti (${error.message})`)
  }

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Povpraševanja</h1>

      <form className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-muted-foreground">Iskanje</label>
          <input
            name="search"
            defaultValue={search}
            placeholder="Naslov ali mesto"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Status</label>
          <select name="status" defaultValue={status} className="rounded-md border px-3 py-2">
            <option value="vse">Vsi</option>
            <option value="odprto">Odprto</option>
            <option value="v_teku">V teku</option>
            <option value="zakljuceno">Zaključeno</option>
            <option value="preklicano">Preklicano</option>
          </select>
        </div>
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Filtriraj</button>
      </form>

      <div className="rounded-lg border bg-card">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left">Naslov</th>
              <th className="px-4 py-3 text-left">Kategorija</th>
              <th className="px-4 py-3 text-left">Mesto</th>
              <th className="px-4 py-3 text-left">Naročnik</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Datum</th>
              <th className="px-4 py-3 text-left">Akcija</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).length === 0 ? (
              <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={7}>Ni podatkov</td></tr>
            ) : (
              (data ?? []).map((row: any) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3">{row.title}</td>
                  <td className="px-4 py-3">{row.categories?.name || '—'}</td>
                  <td className="px-4 py-3">{row.location_city}</td>
                  <td className="px-4 py-3">{row.profiles?.full_name || row.profiles?.email || '—'}</td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="px-4 py-3">{new Date(row.created_at).toLocaleDateString('sl-SI')}</td>
                  <td className="px-4 py-3">
                    <Link className="text-primary hover:underline" href={`/admin/povprasevanja/${row.id}`}>
                      Odpri
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Skupaj: {total}</span>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                className="rounded border px-3 py-1"
                href={`/admin/povprasevanja?page=${page - 1}&search=${encodeURIComponent(search)}&status=${status}`}
              >
                Nazaj
              </Link>
            ) : <span className="rounded border px-3 py-1 opacity-50">Nazaj</span>}
            <span className="rounded border px-3 py-1">Stran {page}/{totalPages}</span>
            {page < totalPages ? (
              <Link
                className="rounded border px-3 py-1"
                href={`/admin/povprasevanja?page=${page + 1}&search=${encodeURIComponent(search)}&status=${status}`}
              >
                Naprej
              </Link>
            ) : <span className="rounded border px-3 py-1 opacity-50">Naprej</span>}
          </div>
        </div>
      )}
    </div>
  )
}
