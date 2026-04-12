import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'

type ParsedInquiry = {
  title: string
  description: string
  suggestedCategory: string
  urgency: 'normalno' | 'kmalu' | 'nujno'
  followUpQuestions: string[]
}

function parseResponse(raw: string): ParsedInquiry {
  const match = raw.match(/\{[\s\S]*\}/)
  const fallback: ParsedInquiry = {
    title: 'Novo povpraševanje',
    description: raw,
    suggestedCategory: 'Splošno',
    urgency: 'normalno',
    followUpQuestions: [],
  }

  if (!match) return fallback

  try {
    const json = JSON.parse(match[0])
    return {
      title: json.title || fallback.title,
      description: json.description || fallback.description,
      suggestedCategory: json.suggestedCategory || fallback.suggestedCategory,
      urgency: ['normalno', 'kmalu', 'nujno'].includes(json.urgency) ? json.urgency : 'normalno',
      followUpQuestions: Array.isArray(json.followUpQuestions) ? json.followUpQuestions.slice(0, 3) : [],
    }
  } catch {
    return fallback
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ success: false, error: 'Niste prijavljeni.' }, { status: 401 })
    }

    const body = await req.json()
    const input = body?.input as string

    if (!input?.trim()) {
      return NextResponse.json({ success: false, error: 'Opis je obvezen.' }, { status: 400 })
    }

    const prompt = `
Uporabnik opisuje težavo za LiftGO povpraševanje v slovenščini.
Vrnite STROGO JSON:
{
  "title": "kratek naslov",
  "description": "razširjen opis",
  "suggestedCategory": "predlagana kategorija",
  "urgency": "normalno|kmalu|nujno",
  "followUpQuestions": ["vprašanje1", "vprašanje2"]
}

Opis uporabnika:
${input}
`

    const ai = await executeAgent({
      userId: user.id,
      agentType: 'general_chat',
      userMessage: prompt,
      useRAG: false,
      useTools: false,
    })

    const data = parseResponse(ai.response)
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('[parse-inquiry] error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri AI razčlenitvi povpraševanja.' }, { status: 500 })
  }
}
