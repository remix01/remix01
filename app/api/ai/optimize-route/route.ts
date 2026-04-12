import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Visit = {
  id: string
  title?: string
  location_city?: string
  scheduled_at?: string
  lat?: number
  lng?: number
}

function dist(a: Visit, b: Visit) {
  if (a.lat == null || a.lng == null || b.lat == null || b.lng == null) return Number.MAX_SAFE_INTEGER
  const dx = a.lat - b.lat
  const dy = a.lng - b.lng
  return Math.sqrt(dx * dx + dy * dy)
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const visits = (body?.visits || []) as Visit[]
    if (!Array.isArray(visits) || visits.length === 0) {
      return NextResponse.json({ success: true, data: [] })
    }

    const hasCoords = visits.every((v) => v.lat != null && v.lng != null)

    let ordered: Visit[] = []
    if (hasCoords) {
      const remaining = [...visits]
      let current = remaining.shift()!
      ordered.push(current)
      while (remaining.length > 0) {
        let idx = 0
        let best = Number.MAX_SAFE_INTEGER
        remaining.forEach((candidate, i) => {
          const d = dist(current, candidate)
          if (d < best) {
            best = d
            idx = i
          }
        })
        current = remaining.splice(idx, 1)[0]
        ordered.push(current)
      }
    } else {
      ordered = [...visits].sort((a, b) => new Date(a.scheduled_at || 0).getTime() - new Date(b.scheduled_at || 0).getTime())
    }

    const result = ordered.map((v, i) => ({
      ...v,
      order: i + 1,
      estimatedTravelMinutes: i === 0 ? 0 : 20,
    }))

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('[optimize-route] error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri optimizaciji poti' }, { status: 500 })
  }
}
