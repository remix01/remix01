import { NextRequest, NextResponse } from 'next/server'
import { executeAgent, AgentAccessError } from '@/lib/ai/orchestrator'
import { validateAIRequest } from '@/lib/ai/ai-security-middleware'

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

export async function POST(req: NextRequest) {
  try {
    const security = await validateAIRequest(req, { agentType: 'offer_writing' })
    if ('error' in security) return security.error
    const { context: secCtx } = security

    const body = await req.json()
    const prompt = `Na podlagi spodnjega konteksta pripravi 3 kratke profesionalne odgovore v slovenščini.
Vrni STROGO JSON: {"replies":["...","...","..."]}

Opis povpraševanja: ${body?.description || ''}
Zgodovina pogovora: ${body?.history || ''}`

    const ai = await executeAgent({
      userId: secCtx.userId,
      agentType: 'offer_writing',
      userMessage: prompt,
      useRAG: false,
      useTools: false,
    })

    const replies = parseReplies(ai.response)
    return NextResponse.json({ success: true, data: replies })
  } catch (error) {
    if (error instanceof AgentAccessError) {
      return NextResponse.json({ success: false, error: 'Za to funkcijo potrebujete PRO naročnino.' }, { status: 403 })
    }
    console.error('[generate-replies] error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri generiranju odgovorov' }, { status: 500 })
  }
}
