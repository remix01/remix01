import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { randomUUID } from 'node:crypto'

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { csv } = await req.json()
  if (!csv || typeof csv !== 'string') return NextResponse.json({ error: 'CSV is required' }, { status: 400 })

  const lines = csv.split(/\r?\n/).filter(Boolean)
  const [header, ...rows] = lines
  const cols = header.split(',').map((c) => c.trim().toLowerCase())
  const idx = (k: string) => cols.indexOf(k)

  const inserts = rows.map((row) => {
    const parts = row.split(',').map((v) => v.trim())
    const id = randomUUID()
    const ime = parts[idx('ime')] || ''
    const mesto = parts[idx('mesto')] || ''
    const kategorija = parts[idx('kategorija')] || 'splošne storitve'
    return {
      profile: { id, role: 'obrtnik', full_name: ime, location_city: mesto },
      obrtnik: {
        id,
        business_name: ime,
        description: `${kategorija} v mestu ${mesto}.`,
        profile_status: 'lead',
        is_claimed: false,
        is_verified: false,
        source: 'import',
        visibility: 'public_limited',
        avg_rating: 0,
        total_reviews: 0,
      },
    }
  })

  const { error: pErr } = await supabaseAdmin.from('profiles').insert(inserts.map((x) => x.profile))
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  const { error: oErr } = await supabaseAdmin.from('obrtnik_profiles').insert(inserts.map((x) => x.obrtnik))
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, imported: inserts.length, status: 'lead' })
}
