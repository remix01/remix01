import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { randomUUID } from 'node:crypto'

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const page = Math.max(1, Number(searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 50)))
  const status = searchParams.get('status') || 'lead'
  const search = searchParams.get('search') || ''

  let query = supabaseAdmin
    .from('obrtnik_profiles')
    .select(
      `id, business_name, description, profile_status, is_verified, is_claimed, source, visibility, avg_rating, total_reviews, created_at,
       profile:profiles!id(full_name, location_city, email)`,
      { count: 'exact' }
    )
    .eq('profile_status', status)
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (search) {
    query = query.ilike('business_name', `%${search}%`)
  }

  const { data, error, count } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, total: count, page, limit })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ime, mesto, kategorija, opis, telefon, email } = body

  if (!ime?.trim() || !mesto?.trim()) {
    return NextResponse.json({ error: 'Ime in mesto sta obvezna' }, { status: 400 })
  }

  const id = randomUUID()

  const { error: pErr } = await supabaseAdmin.from('profiles').insert({
    id,
    role: 'obrtnik',
    full_name: ime.trim(),
    location_city: mesto.trim(),
    ...(email ? { email: email.trim() } : {}),
    ...(telefon ? { phone: telefon.trim() } : {}),
  })
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const { error: oErr } = await supabaseAdmin.from('obrtnik_profiles').insert({
    id,
    business_name: ime.trim(),
    description: opis?.trim() || `${(kategorija || 'splošne storitve').trim()} v mestu ${mesto.trim()}.`,
    profile_status: 'lead',
    is_claimed: false,
    is_verified: false,
    source: 'manual',
    visibility: 'public_limited',
    avg_rating: 0,
    total_reviews: 0,
  })
  if (oErr) {
    await supabaseAdmin.from('profiles').delete().eq('id', id)
    return NextResponse.json({ error: oErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id }, { status: 201 })
}
