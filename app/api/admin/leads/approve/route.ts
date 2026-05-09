import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin, logAction } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array required' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ profile_status: 'active', is_verified: true })
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await logAction(admin.id, 'APPROVE_LEADS', 'obrtnik_profiles', ids.join(','), { profile_status: 'lead' }, { profile_status: 'active', is_verified: true })

  return NextResponse.json({ ok: true, approved: ids.length })
}
