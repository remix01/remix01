import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { requireAdmin } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chat } from '@/lib/ai/providers'

const CACHE_KEY = 'admin:ai:dnevni-pregled:v1'
const TTL_SECONDS = 60 * 60

function getRedis() {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

export async function GET() {
  try {
    await requireAdmin()

    const redis = getRedis()
    if (redis) {
      const cached = await redis.get<string>(CACHE_KEY)
      if (cached) {
        return NextResponse.json({ briefing: cached, cached: true })
      }
    }

    const now = new Date()
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const prev24h = new Date(last24h.getTime() - 24 * 60 * 60 * 1000)

    const [newUsers, newInquiries, prevInquiries, openDisputes, revenueRows, topCategoryRows] = await Promise.all([
      supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', last24h.toISOString()),
      supabaseAdmin.from('povprasevanja').select('*', { count: 'exact', head: true }).gte('created_at', last24h.toISOString()),
      supabaseAdmin.from('povprasevanja').select('*', { count: 'exact', head: true }).gte('created_at', prev24h.toISOString()).lt('created_at', last24h.toISOString()),
      supabaseAdmin.from('escrow_disputes').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabaseAdmin.from('payment').select('amount, created_at, status').gte('created_at', prev24h.toISOString()).in('status', ['PAID', 'RELEASED', 'COMPLETED']),
      supabaseAdmin.from('povprasevanja').select('kategorija').gte('created_at', last24h.toISOString()).limit(500),
    ])

    const currentRevenue = (revenueRows.data || []).filter((r: any) => new Date(r.created_at) >= last24h).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)
    const previousRevenue = (revenueRows.data || []).filter((r: any) => new Date(r.created_at) < last24h).reduce((s: number, r: any) => s + Number(r.amount || 0), 0)

    const categoryCounts = (topCategoryRows.data || []).reduce((acc: Record<string, number>, row: any) => {
      const key = row.kategorija || 'neznano'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ni podatkov'

    const briefingPrompt = `Pripravi kratek dnevni briefing za admin portal v slovenščini.
Podatki:
- Novi uporabniki (24h): ${newUsers.count || 0}
- Nova povpraševanja (24h): ${newInquiries.count || 0}
- Povpraševanja (prejšnjih 24h): ${prevInquiries.count || 0}
- Odprti spori: ${openDisputes.count || 0}
- Prihodki 24h: €${currentRevenue.toFixed(2)}
- Prihodki prejšnjih 24h: €${previousRevenue.toFixed(2)}
- Top kategorija: ${topCategory}

Format:
- Naslov
- 4-6 alinej
- Opozorila z emoji ⚠️ če zaznaš padec konverzije ali prihodkov.
Bodi konkreten in kratek.`

    const ai = await chat([{ role: 'user', content: briefingPrompt }], { temperature: 0.2, maxTokens: 500 })

    if (redis) {
      await redis.set(CACHE_KEY, ai.content, { ex: TTL_SECONDS })
    }

    return NextResponse.json({ briefing: ai.content, cached: false })
  } catch (error: any) {
    const status = error?.message === 'UNAUTHORIZED' ? 401 : error?.message === 'FORBIDDEN' ? 403 : 500
    return NextResponse.json({ error: 'Napaka pri AI briefingu.' }, { status })
  }
}
