import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

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

    const jsonMatch = ai.response.match(/\{[\s\S]*\}/)
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{"tips":[]}')
    return NextResponse.json({ success: true, data: parsed })
  } catch (error) {
    console.error('[home-advisor] error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri AI priporočilih.' }, { status: 500 })
  }
}
