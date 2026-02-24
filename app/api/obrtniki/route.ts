import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const storitev = searchParams.get('storitev')
  const lokacija = searchParams.get('lokacija')
  const adminReq = searchParams.get('admin') === 'true'

  const admin = adminReq ? await verifyAdmin(req) : null

  let query = supabaseAdmin
    .from('obrtniki')
    .select('id,ime,priimek,podjetje,specialnosti,lokacije,cena_min,cena_max,ocena,stevilo_ocen,leta_izkusenj,profilna_slika_url,status')
    .order('ocena', { ascending: false })

  // Public: only verified
  if (!admin) query = query.eq('status', 'verified')
  
  if (storitev) query = query.contains('specialnosti', [storitev])
  if (lokacija) query = query.overlaps('lokacije', [lokacija])

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: Request) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('obrtniki')
    .insert(body)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
