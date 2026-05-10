import { NextResponse } from 'next/server'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    await requireAdmin()
  } catch (error: unknown) {
    const failure = toAdminAuthFailure(error)
    return NextResponse.json({ ok: false, error: 'Napaka pri nalaganju opozoril.', code: failure.code, alerts: [] }, { status: failure.status })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('admin_alerts')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[admin-alerts] query failed', { message: error.message, code: error.code })
      return NextResponse.json(
        { ok: false, error: 'Napaka pri nalaganju opozoril.', code: 'ALERTS_QUERY_FAILED', alerts: [] },
        { status: 500 }
      )
    }

    return NextResponse.json({ ok: true, alerts: data || [] })
  } catch (error: any) {
    console.error('[admin-alerts] unexpected error', error)
    return NextResponse.json({ ok: false, error: 'Napaka pri nalaganju opozoril.', code: 'ALERTS_UNKNOWN', alerts: [] }, { status: 500 })
  }
}
