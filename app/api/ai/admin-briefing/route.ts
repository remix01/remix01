import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'
import { requireAdmin, toAdminAuthFailure } from '@/lib/admin-auth'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { chat } from '@/lib/ai/providers'

const CACHE_KEY = 'admin:ai:dnevni-pregled:v1'
const TTL_SECONDS = 60 * 60
const FALLBACK_BRIEFING = 'Dnevni AI briefing trenutno ni na voljo. Osveži stran kasneje.'

function getRedis() {
  // Support both canonical Upstash env names and Vercel KV aliases.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN

  // If one side is missing, disable cache gracefully instead of throwing.
  if (!url || !token) return null

  return new Redis({ url, token })
}

function countFromResult(result: any): number {
  if (!result || result.error) return 0
  return result.count || 0
}

function rowsFromResult<T = any>(result: any): T[] {
  if (!result || result.error || !Array.isArray(result.data)) return []
  return result.data
}

export async function GET() {
  try {
    await requireAdmin()
  } catch (error: unknown) {
    const failure = toAdminAuthFailure(error)
    return NextResponse.json({ ok: false, error: 'Napaka pri AI briefingu.', code: failure.code, briefing: FALLBACK_BRIEFING, cached: false, fallback: true }, { status: failure.status })
  }

  try {
    const redis = getRedis()
    if (redis) {
      try {
        const cached = await redis.get<string>(CACHE_KEY)
        if (cached) {
          return NextResponse.json({ ok: true, briefing: cached, cached: true, fallback: false })
        }
      } catch (cacheError) {
        console.warn('[admin-briefing] cache read failed', cacheError)
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

    const revenueData = rowsFromResult<any>(revenueRows)
    const categoryData = rowsFromResult<any>(topCategoryRows)

    const currentRevenue = revenueData.filter((r) => new Date(r.created_at) >= last24h).reduce((s, r) => s + Number(r.amount || 0), 0)
    const previousRevenue = revenueData.filter((r) => new Date(r.created_at) < last24h).reduce((s, r) => s + Number(r.amount || 0), 0)

    const categoryCounts = categoryData.reduce((acc: Record<string, number>, row: any) => {
      const key = row.kategorija || 'neznano'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'ni podatkov'

    const briefingPrompt = `Pripravi kratek dnevni briefing za admin portal v slovenščini.
Podatki:
- Novi uporabniki (24h): ${countFromResult(newUsers)}
- Nova povpraševanja (24h): ${countFromResult(newInquiries)}
- Povpraševanja (prejšnjih 24h): ${countFromResult(prevInquiries)}
- Odprti spori: ${countFromResult(openDisputes)}
- Prihodki 24h: €${currentRevenue.toFixed(2)}
- Prihodki prejšnjih 24h: €${previousRevenue.toFixed(2)}
- Top kategorija: ${topCategory}

Format:
- Naslov
- 4-6 alinej
- Opozorila z emoji ⚠️ če zaznaš padec konverzije ali prihodkov.
Bodi konkreten in kratek.`

    try {
      const ai = await chat([{ role: 'user', content: briefingPrompt }], { temperature: 0.2, maxTokens: 500 })
      if (redis) {
        try {
          await redis.set(CACHE_KEY, ai.content, { ex: TTL_SECONDS })
        } catch (cacheWriteError) {
          console.warn('[admin-briefing] cache write failed', cacheWriteError)
        }
      }
      return NextResponse.json({ ok: true, briefing: ai.content, cached: false, fallback: false })
    } catch (aiError: any) {
      console.error('[admin-briefing] AI unavailable', aiError)
      return NextResponse.json({ ok: true, briefing: FALLBACK_BRIEFING, cached: false, fallback: true, error: 'AI_BRIEFING_UNAVAILABLE' })
    }
  } catch (error: any) {
    console.error('[admin-briefing] unexpected error', error)
    return NextResponse.json({ ok: true, briefing: FALLBACK_BRIEFING, cached: false, fallback: true, error: 'AI_BRIEFING_UNAVAILABLE' })
  }
}
