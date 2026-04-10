import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function getDashboardStats() {
  const [
    { count: inquiriesToday },
    { count: inquiriesOpen },
    { count: partnersTotal },
    { count: partnersActive },
    { count: usersTotal },
  ] = await Promise.all([
    supabaseAdmin
      .from('povprasevanja')
      .select('*', { head: true, count: 'exact' })
      .gte('created_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString()),
    supabaseAdmin
      .from('povprasevanja')
      .select('*', { head: true, count: 'exact' })
      .eq('status', 'odprto'),
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('*', { head: true, count: 'exact' }),
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('*', { head: true, count: 'exact' })
      .eq('is_available', true),
    supabaseAdmin
      .from('profiles')
      .select('*', { head: true, count: 'exact' })
      .eq('role', 'narocnik'),
  ])

  return {
    inquiriesToday: inquiriesToday ?? 0,
    inquiriesOpen: inquiriesOpen ?? 0,
    partnersTotal: partnersTotal ?? 0,
    partnersActive: partnersActive ?? 0,
    usersTotal: usersTotal ?? 0,
  }
}

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Nadzorna plošča</h1>
        <p className="mt-2 text-muted-foreground">Pregled ključnih metrik brez API 401 napak.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader><CardTitle className="text-sm">Povpraševanja danes</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.inquiriesToday}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Odprta povpraševanja</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.inquiriesOpen}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Partnerji skupaj</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.partnersTotal}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Aktivni partnerji</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.partnersActive}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">Stranke skupaj</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{stats.usersTotal}</p></CardContent>
        </Card>
      </div>
    </div>
  )
}
