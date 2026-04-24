import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

export async function GET(req: Request) {
  const admin = await verifyAdmin(req)
  if (!admin) return fail('Unauthorized', 401)

  const [
    { count: skupajPovprasevanj },
    { count: novaPovprasevanja },
    { count: skupajObrtnikov },
    { count: pendingObrtnikov },
    { count: zakljucenaDela },
    { data: zadnjih7Dni },
  ] = await Promise.all([
    supabaseAdmin.from('povprasevanja').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('povprasevanja').select('*', { count: 'exact', head: true }).eq('status', 'novo'),
    supabaseAdmin.from('obrtniki').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('obrtniki').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('povprasevanja').select('*', { count: 'exact', head: true }).eq('status', 'zakljuceno'),
    supabaseAdmin.from('povprasevanja')
      .select('created_at, status')
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at'),
  ])

  return ok({
    skupajPovprasevanj,
    novaPovprasevanja,
    skupajObrtnikov,
    pendingObrtnikov,
    zakljucenaDela,
    zadnjih7Dni,
  })
}
