import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_: Request, context: RouteContext) {
  try {
    const admin = await requireAdmin()
    const { id } = await context.params

    const { error } = await supabaseAdmin
      .from('admin_alerts')
      .update({ status: 'dismissed', dismissed_at: new Date().toISOString(), dismissed_by: admin.userId })
      .eq('id', id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri zapiranju opozorila.' }, { status })
  }
}
