import { supabaseAdmin } from '@/lib/supabase-admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export const dynamic = 'force-dynamic'

async function getObrtnikiStats() {
  try {
    const [
      { count: totalVerified, error: verifiedError },
      { count: totalUnverified, error: unverifiedError },
      { data: recent, error: recentError }
    ] = await Promise.all([
      supabaseAdmin
        .from('obrtnik_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', true),
      supabaseAdmin
        .from('obrtnik_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_verified', false),
      supabaseAdmin
        .from('obrtnik_profiles')
        .select('id, business_name, is_verified, avg_rating, created_at')
        .order('created_at', { ascending: false })
        .limit(20)
    ])

    const err = verifiedError || unverifiedError || recentError
    if (err) throw err

    return {
      success: true,
      totalVerified: totalVerified || 0,
      totalUnverified: totalUnverified || 0,
      recent: recent || [],
      error: null
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    return { success: false, totalVerified: 0, totalUnverified: 0, recent: [], error: errorMsg }
  }
}

export default async function MigracijePage() {
  const stats = await getObrtnikiStats()

  const total = stats.totalVerified + stats.totalUnverified
  const pct = total > 0 ? Math.round((stats.totalVerified / total) * 100) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Obrtniki — pregled</h1>
        <p className="text-muted-foreground mt-1">
          Vsi obrtniki so v tabeli <code>obrtnik_profiles</code>. Stara tabela <code>partners</code> ni bila nikoli ustvarjena.
        </p>
      </div>

      {stats.error && (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Napaka pri branju podatkov: {stats.error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Skupaj</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verificiranih</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalVerified}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Čakajočih verifikacije</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.totalUnverified}</div>
            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-600 transition-all" style={{ width: `${pct}%` }} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Zadnjih 20 registriranih</CardTitle>
          <CardDescription>Urejeno po datumu registracije (najnovejši najprej)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Podjetje</TableHead>
                  <TableHead>Ocena</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registriran</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recent.map((o: any) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-medium">{o.business_name}</TableCell>
                    <TableCell>{o.avg_rating ?? '—'}</TableCell>
                    <TableCell>
                      <Badge variant={o.is_verified ? 'default' : 'secondary'}>
                        {o.is_verified ? 'Verificiran' : 'Čaka'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.created_at ? new Date(o.created_at).toLocaleDateString('sl-SI') : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
