import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function GET() {
  try {
    await requireAdmin()
    const { data, error } = await supabaseAdmin
      .from('alert_log')
      .select('*')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) throw error
    return NextResponse.json({ alerts: data || [] })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri nalaganju opozoril.' }, { status })
  }
}
