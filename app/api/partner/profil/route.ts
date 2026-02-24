import { getPartner } from '@/lib/supabase-partner'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

/**
 * GET — partner profile
 */
export async function GET() {
  const partner = await getPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(partner)
}

/**
 * PATCH — update partner profile
 */
export async function PATCH(req: Request) {
  const partner = await getPartner()
  if (!partner) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const allowed = ['telefon', 'bio', 'specialnosti', 'lokacije',
                   'cena_min', 'cena_max', 'leta_izkusenj', 'podjetje']
  const updates: Record<string, unknown> = {}
  allowed.forEach(k => { if (body[k] !== undefined) updates[k] = body[k] })

  const { data, error } = await supabaseAdmin
    .from('obrtniki')
    .update(updates)
    .eq('id', partner.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
