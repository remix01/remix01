import { NextRequest, NextResponse } from 'next/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { validateAIRequest } from '@/lib/ai/ai-security-middleware'

export async function POST(req: NextRequest) {
  try {
    const security = await validateAIRequest(req, { agentType: 'support_agent' })
    if ('error' in security) return security.error
    const { context: secCtx } = security

    const body = await req.json()
    const logs = body?.logs || []

    const prompt = `
Na podlagi zgodovine vzdrževanja doma pripravi 3 kratke slovenske nasvete.
Vrnite STROGO JSON: {"tips": ["...", "...", "..."]}

Podatki:
${JSON.stringify(logs)}
`

    const ai = await executeAgent({
      userId: secCtx.userId,
      agentType: 'support_agent',
      userMessage: prompt,
      useRAG: false,
      useTools: false,
    })

    const jsonMatch = ai.response.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{"tips":[]}')
    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('[home-advisor] error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri AI priporočilih.' }, { status: 500 })
  }
}
