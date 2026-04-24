import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { ok, fail } from '@/lib/http/response'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Unauthorized', 401)

    const body = await req.json()
    const logs = body?.logs || []

    const prompt = `
Na podlagi zgodovine vzdrževanja doma pripravi 3 kratke slovenske nasvete.
Vrnite STROGO JSON: {"tips": ["...", "...", "..."]}

Podatki:
${JSON.stringify(logs)}
`

    const ai = await executeAgent({
      userId: user.id,
      agentType: 'general_chat',
      userMessage: prompt,
      useRAG: false,
      useTools: false,
    })

    const parsed = JSON.parse((ai.response.match(/\{[\s\S]*\}/) || [])[0] || '{"tips":[]}')
    return ok({ success: true, data: parsed })
  } catch (error) {
    console.error('[home-advisor] error:', error)
    return fail('Napaka pri AI priporočilih.', 500)
  }
}
