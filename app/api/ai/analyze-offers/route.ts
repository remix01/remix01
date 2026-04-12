import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { executeRedisOperation } from '@/lib/cache/redis-client'

type OfferInput = {
  id: string
  price_estimate?: number | null
  message?: string | null
  price_type?: string | null
  rating?: number | null
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const inquiryId = body?.inquiryId as string
    const offers = (body?.offers || []) as OfferInput[]

    if (!inquiryId || offers.length === 0) {
      return NextResponse.json({ success: false, error: 'inquiryId in offers sta obvezna.' }, { status: 400 })
    }

    const offerSignature = offers.map((o) => `${o.id}:${o.price_estimate ?? 0}:${o.rating ?? 0}`).join('|')
    const cacheKey = `ai:offers-analysis:${inquiryId}:${offerSignature}`

    const cached = await executeRedisOperation<string | null>(
      (redis) => redis.get<string>(cacheKey),
      null,
      'offers-analysis:get'
    )

    if (cached) {
      return NextResponse.json({ success: true, data: JSON.parse(cached), cached: true })
    }

    const prompt = `
Analiziraj ponudbe za stranko in vrni STROGO JSON v slovenščini:
{
  "comparisonTable": [{"offerId":"","price":"","materialIncluded":"","duration":""}],
  "highlights": {"bestValue":"","fastest":"","highestRated":""},
  "redFlags": ["..."]
}

Ponudbe:
${JSON.stringify(offers)}
`

    const ai = await executeAgent({
      userId: user.id,
      agentType: 'general_chat',
      userMessage: prompt,
      useRAG: false,
      useTools: false,
    })

    const parsed = JSON.parse((ai.response.match(/\{[\s\S]*\}/) || [])[0] || '{}')

    await executeRedisOperation(
      (redis) => redis.set(cacheKey, JSON.stringify(parsed), { ex: 60 * 30 }),
      null,
      'offers-analysis:set'
    )

    return NextResponse.json({ success: true, data: parsed, cached: false })
  } catch (error) {
    console.error('[analyze-offers] error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri AI analizi ponudb.' }, { status: 500 })
  }
}
