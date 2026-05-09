import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { randomUUID } from 'node:crypto'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++ }
      else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim()); current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { csv } = await req.json()
  if (!csv || typeof csv !== 'string') return NextResponse.json({ error: 'CSV is required' }, { status: 400 })

  const lines = csv.split(/\r?\n/).filter(Boolean)
  if (lines.length < 2) return NextResponse.json({ error: 'CSV needs header + at least one row' }, { status: 400 })
  const [header, ...rows] = lines
  const cols = parseCsvLine(header).map((c) => c.toLowerCase())
  const idx = (k: string) => cols.indexOf(k)

  const inserts = rows
    .map((row) => {
      const parts = parseCsvLine(row)
      const ime = parts[idx('ime')]?.trim() || ''
      const mesto = parts[idx('mesto')]?.trim() || ''
      const kategorija = parts[idx('kategorija')]?.trim() || 'splošne storitve'
      const opis = parts[idx('opis')]?.trim() || ''
      if (!ime || !mesto) return null
      const id = randomUUID()
      return {
        profile: { id, role: 'obrtnik', full_name: ime, location_city: mesto },
        obrtnik: {
          id,
          business_name: ime,
          description: opis || `${kategorija} v mestu ${mesto}.`,
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
    .filter((x): x is NonNullable<typeof x> => x !== null)

  const { error: pErr } = await supabaseAdmin.from('profiles').insert(inserts.map((x) => x.profile))
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })
  const { error: oErr } = await supabaseAdmin.from('obrtnik_profiles').insert(inserts.map((x) => x.obrtnik))
  if (oErr) return NextResponse.json({ error: oErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, imported: inserts.length, status: 'lead' })
}
