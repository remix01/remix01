import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { ok, fail } from '@/lib/http/response'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Unauthorized', 401)

    const { imageUrl, description } = await req.json()
    if (!imageUrl) {
      return fail('imageUrl is required', 400)
    }

    const ai = await executeAgent({
      userId: user.id,
      agentType: 'video_diagnosis',
      userMessage: `Analiziraj sliko in pripravi kratek povzetek problema, predlagane korake popravila in okviren seznam materiala. Kontekst: ${description || ''}`,
      imageUrl,
      useRAG: false,
      useTools: false,
    })

    return ok({ success: true, data: ai.response })
  } catch (error) {
    console.error('[analyze-media] error:', error)
    return fail('Napaka pri AI analizi medija', 500)
  }
}
