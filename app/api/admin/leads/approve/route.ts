import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ids, status = 'active' } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
  }

  const allowedStatuses = ['lead', 'claimed', 'active', 'inactive']
  if (!allowedStatuses.includes(status)) {
    return NextResponse.json({ error: `Status must be one of: ${allowedStatuses.join(', ')}` }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('obrtnik_profiles')
    .update({ profile_status: status, updated_at: new Date().toISOString() })
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, updated: ids.length, status })
}
