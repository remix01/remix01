import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

export async function GET() {
  try {
    await requireAdmin()
    const { data, error } = await supabaseAdmin
      .from('admin_alerts')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return ok({ alerts: data || [] })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return fail('Napaka pri nalaganju opozoril.', status)
  }
}
