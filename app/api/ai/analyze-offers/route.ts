import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { executeRedisOperation } from '@/lib/cache/redis-client'
import { ok, fail } from '@/lib/http/response'

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
    if (!user) return fail('Unauthorized', 401)

    const body = await req.json()
    const inquiryId = body?.inquiryId as string
    const offers = (body?.offers || []) as OfferInput[]

    if (!inquiryId || offers.length === 0) {
      return fail('inquiryId in offers sta obvezna.', 400)
    }

    const offerSignature = offers.map((o) => `${o.id}:${o.price_estimate ?? 0}:${o.rating ?? 0}`).join('|')
    const cacheKey = `ai:offers-analysis:${inquiryId}:${offerSignature}`

    const cached = await executeRedisOperation<string | null>(
      (redis) => redis.get<string>(cacheKey),
      null,
      'offers-analysis:get'
    )

    if (cached) {
      return ok({ success: true, data: JSON.parse(cached), cached: true })
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

    return ok({ success: true, data: parsed, cached: false })
  } catch (error) {
    console.error('[analyze-offers] error:', error)
    return fail('Napaka pri AI analizi ponudb.', 500)
  }
}
