import Link from 'next/link'
import { AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { StatusBadge } from '@/components/admin/StatusBadge'

interface PageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    page?: string
  }>
}

const PAGE_SIZE = 25

export default async function PartnerjiPage({ searchParams }: PageProps) {
  const { search = '', status = '', page: pageParam = '1' } = await searchParams
  const page = Math.max(1, Number(pageParam) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, business_name, avg_rating, is_verified, is_available, created_at', { count: 'exact' })

  if (status === 'PENDING') query = query.eq('is_verified', false)
  if (status === 'AKTIVEN') query = query.eq('is_verified', true).eq('is_available', true)
  if (status === 'SUSPENDIRAN') query = query.eq('is_available', false)

  if (search) {
    query = query.ilike('business_name', `%${search}%`)
  }

  const { data: obrtniki, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    throw new Error(`Pri nalaganju partnerjev je prišlo do napake: ${error.message}`)
  }

  const ids = (obrtniki ?? []).map((o: any) => o.id)
  const { data: profiles } = ids.length
    ? await supabaseAdmin.from('profiles').select('id, email, phone').in('id', ids)
    : { data: [] as any[] }

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]))
  const rows = (obrtniki ?? []).map((o: any) => {
    const p = profileMap.get(o.id)
    const statusLabel = !o.is_verified ? 'PENDING' : (o.is_available ? 'AKTIVEN' : 'SUSPENDIRAN')
    return {
      id: o.id,
      ime: o.business_name || '—',
      email: p?.email || '—',
      telefon: p?.phone || '—',
      status: statusLabel,
      ocena: Number(o.avg_rating || 0),
      created_at: o.created_at,
    }
  })

  const pendingCount = rows.filter((r) => r.status === 'PENDING').length
  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Partnerji</h1>
        <p className="text-muted-foreground">Upravljanje z vsemi partnerji</p>
      </div>

      {pendingCount > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Čakajoče verifikacije</AlertTitle>
          <AlertDescription>{pendingCount} partnerjev čaka na verifikacijo.</AlertDescription>
        </Alert>
      )}

      <form className="flex flex-col gap-3 md:flex-row md:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-sm text-muted-foreground">Iskanje</label>
          <input name="search" defaultValue={search} className="w-full rounded-md border px-3 py-2" placeholder="Ime podjetja" />
        </div>
        <div>
          <label className="mb-1 block text-sm text-muted-foreground">Status</label>
          <select name="status" defaultValue={status} className="rounded-md border px-3 py-2">
            <option value="">Vsi statusi</option>
            <option value="PENDING">Čakajo verifikacijo</option>
            <option value="AKTIVEN">Aktivni</option>
            <option value="SUSPENDIRAN">Suspendirani</option>
          </select>
        </div>
        <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground">Filtriraj</button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Seznam partnerjev ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-4 py-3 text-left">Ime</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Telefon</th>
                  <th className="px-4 py-3 text-left">Ocena</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Datum</th>
                  <th className="px-4 py-3 text-left">Akcija</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td className="px-4 py-6 text-center text-muted-foreground" colSpan={7}>Ni partnerjev</td></tr>
                ) : rows.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="px-4 py-3">{row.ime}</td>
                    <td className="px-4 py-3">{row.email}</td>
                    <td className="px-4 py-3">{row.telefon}</td>
                    <td className="px-4 py-3">{row.ocena.toFixed(1)}</td>
                    <td className="px-4 py-3"><StatusBadge status={row.status as any} /></td>
                    <td className="px-4 py-3">{new Date(row.created_at).toLocaleDateString('sl-SI')}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/partnerji/${row.id}`} className="text-primary hover:underline">Odpri</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stran {page}/{totalPages}</span>
              <div className="flex gap-2">
                {page > 1 ? <Link className="rounded border px-3 py-1" href={`/admin/partnerji?page=${page - 1}&search=${encodeURIComponent(search)}&status=${status}`}>Nazaj</Link> : <span className="rounded border px-3 py-1 opacity-50">Nazaj</span>}
                {page < totalPages ? <Link className="rounded border px-3 py-1" href={`/admin/partnerji?page=${page + 1}&search=${encodeURIComponent(search)}&status=${status}`}>Naprej</Link> : <span className="rounded border px-3 py-1 opacity-50">Naprej</span>}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
