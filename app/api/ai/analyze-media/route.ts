import { NextRequest, NextResponse } from 'next/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { validateAIRequest } from '@/lib/ai/ai-security-middleware'

export async function POST(req: NextRequest) {
  try {
    const security = await validateAIRequest(req, { agentType: 'video_diagnosis' })
    if ('error' in security) return security.error
    const { context: secCtx } = security

    const { imageUrl, description } = await req.json()
    if (!imageUrl) {
      return NextResponse.json({ success: false, error: 'imageUrl is required' }, { status: 400 })
    }

    const ai = await executeAgent({
      userId: secCtx.userId,
      agentType: 'video_diagnosis',
      userMessage: `Analiziraj sliko in pripravi kratek povzetek problema, predlagane korake popravila in okviren seznam materiala. Kontekst: ${description || ''}`,
      imageUrl,
      useRAG: false,
      useTools: false,
    })

    return NextResponse.json({ success: true, data: ai.response })
  } catch (error) {
    console.error('[analyze-media] error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri AI analizi medija' }, { status: 500 })
  }
}
