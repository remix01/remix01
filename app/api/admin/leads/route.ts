import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { randomUUID } from 'node:crypto'

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const searchParams = req.nextUrl.searchParams
  const status = searchParams.get('status') || 'lead'
  const limit = parseInt(searchParams.get('limit') || '50', 10)
  const offset = parseInt(searchParams.get('offset') || '0', 10)

  const { data, error, count } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, business_name, description, location_city, category_id, profile_status, is_verified, avg_rating, total_reviews, created_at, source', { count: 'exact' })
    .eq('profile_status', status)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ data, count, status })
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { business_name, location_city, category_id, description } = body

  if (!business_name || !location_city) {
    return NextResponse.json({ error: 'business_name and location_city are required' }, { status: 400 })
  }

  const id = randomUUID()

  const profileData = {
    id,
    role: 'obrtnik',
    full_name: business_name,
    location_city,
    created_at: new Date().toISOString(),
  }

  const obrtnikData = {
    id,
    business_name,
    location_city,
    category_id: category_id || null,
    description: description || '',
    profile_status: 'lead',
    is_claimed: false,
    is_verified: false,
    source: 'manual',
    visibility: 'public_limited',
    avg_rating: 0,
    total_reviews: 0,
    created_at: new Date().toISOString(),
  }

  const { error: pErr } = await supabaseAdmin.from('profiles').insert(profileData)
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  const { error: oErr } = await supabaseAdmin.from('obrtnik_profiles').insert(obrtnikData)
  if (oErr) {
    await supabaseAdmin.from('profiles').delete().eq('id', id)
    return NextResponse.json({ error: oErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id, status: 'lead' }, { status: 201 })
}
