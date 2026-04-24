import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { executeRedisOperation } from '@/lib/cache/redis-client'
import { ok, fail } from '@/lib/http/response'

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Unauthorized', 401)

    const body = await req.json()
    const inquiryId = body?.inquiryId as string | undefined
    if (!inquiryId) {
      return fail('inquiryId is required', 400)
    }

    const cacheKey = `ai:inquiry-analysis:${inquiryId}`
    const cached = await executeRedisOperation<string | null>(
      (redis) => redis.get<string>(cacheKey),
      null,
      'inquiry-analysis:get'
    )

    if (cached) return ok({ data: safeJsonParse(cached, {}) } as Record<string, unknown>)

    const prompt = `Analiziraj naslednje povpraševanje in vrni STROGO JSON brez dodatnega besedila.

Povpraševanje:
- Naslov: ${body?.title || ''}
- Opis: ${body?.description || ''}
- Lokacija: ${body?.location_city || ''}
- Nujnost: ${body?.urgency || ''}

Vrni JSON oblike:
{
  "summary": ["...", "..."],
  "estimatedMaterials": ["...", "..."],
  "estimatedDuration": "...",
  "redFlags": ["...", "..."]
}`

    const ai = await executeAgent({
      userId: user.id,
      agentType: 'general_chat',
      userMessage: prompt,
      useRAG: false,
      useTools: false,
    })

    const jsonMatch = ai.response.match(/\{[\s\S]*\}/)
    const parsed = safeJsonParse(jsonMatch?.[0] || ai.response, {
      summary: [],
      estimatedMaterials: [],
      estimatedDuration: 'Ni ocene',
      redFlags: [],
    })

    await executeRedisOperation(
      (redis) => redis.set(cacheKey, JSON.stringify(parsed), { ex: 60 * 60 * 6 }),
      null,
      'inquiry-analysis:set'
    )

    return ok({ success: true, data: parsed })
  } catch (error) {
    console.error('[analyze-inquiry] error:', error)
    return fail('Napaka pri AI analizi', 500)
  }
}
