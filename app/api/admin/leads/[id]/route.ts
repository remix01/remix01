import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('obrtnik_profiles')
    .delete()
    .eq('id', id)
    .eq('profile_status', 'lead')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
