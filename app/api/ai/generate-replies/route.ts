import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { ok, fail } from '@/lib/http/response'

function parseReplies(text: string): string[] {
  try {
    const parsed = JSON.parse(text) as { replies?: string[] }
    if (Array.isArray(parsed.replies)) return parsed.replies.slice(0, 3)
  } catch {
    // ignore
  }

  return text
    .split('\n')
    .map((line) => line.replace(/^\d+[.)-]\s*/, '').trim())
    .filter(Boolean)
    .slice(0, 3)
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Unauthorized', 401)

    const body = await req.json()
    const prompt = `Na podlagi spodnjega konteksta pripravi 3 kratke profesionalne odgovore v slovenščini.
Vrni STROGO JSON: {"replies":["...","...","..."]}

Opis povpraševanja: ${body?.description || ''}
Zgodovina pogovora: ${body?.history || ''}`

    const ai = await executeAgent({
      userId: user.id,
      agentType: 'offer_writing',
      userMessage: prompt,
      useRAG: false,
      useTools: false,
    })

    const replies = parseReplies(ai.response)
    return ok({ success: true, data: replies })
  } catch (error) {
    console.error('[generate-replies] error:', error)
    return fail('Napaka pri generiranju odgovorov', 500)
  }
}
