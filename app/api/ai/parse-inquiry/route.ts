/**
 * AI Enrichment: Parse Inquiry
 *
 * Category: ENRICHMENT — AI is optional here.
 * If AI is unavailable or times out, we return a basic fallback derived
 * from the raw user input. The inquiry submission MUST NOT be blocked.
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeAgentSafe } from '@/lib/ai/orchestrator'

type ParsedInquiry = {
  title: string
  description: string
  suggestedCategory: string
  urgency: 'normalno' | 'kmalu' | 'nujno'
  followUpQuestions: string[]
  aiEnriched: boolean
}

function parseAIResponse(raw: string, userInput: string): ParsedInquiry {
  const match = raw.match(/\{[\s\S]*\}/)
  const base = buildFallback(userInput)

  if (!match) return base

  try {
    const json = JSON.parse(match[0])
    return {
      title: json.title || base.title,
      description: json.description || base.description,
      suggestedCategory: json.suggestedCategory || base.suggestedCategory,
      urgency: ['normalno', 'kmalu', 'nujno'].includes(json.urgency) ? json.urgency : 'normalno',
      followUpQuestions: Array.isArray(json.followUpQuestions) ? json.followUpQuestions.slice(0, 3) : [],
      aiEnriched: true,
    }
  } catch {
    return base
  }
}

// Rules-based fallback — never calls AI, never fails
function buildFallback(input: string): ParsedInquiry {
  const trimmed = input.trim()
  const words = trimmed.split(/\s+/)
  const title = words.slice(0, 8).join(' ') + (words.length > 8 ? '…' : '')

  const urgencyHints: Record<ParsedInquiry['urgency'], string[]> = {
    nujno: ['nujno', 'takoj', 'hitro', 'urgentno', 'danes'],
    kmalu: ['kmalu', 'čim prej', 'ta teden', 'v kratkem'],
    normalno: [],
  }
  let urgency: ParsedInquiry['urgency'] = 'normalno'
  const lower = trimmed.toLowerCase()
  if (urgencyHints.nujno.some((w) => lower.includes(w))) urgency = 'nujno'
  else if (urgencyHints.kmalu.some((w) => lower.includes(w))) urgency = 'kmalu'

  return {
    title: title || 'Novo povpraševanje',
    description: trimmed,
    suggestedCategory: 'Splošno',
    urgency,
    followUpQuestions: [],
    aiEnriched: false,
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

    const fallback = buildFallback(input)

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

    // ENRICHMENT — 7 s budget, fallback on any failure
    const ai = await executeAgentSafe(
      {
        userId: user.id,
        agentType: 'support_agent',
        userMessage: prompt,
        useRAG: false,
        useTools: false,
      },
      7_000
    )

    const data: ParsedInquiry = ai ? parseAIResponse(ai.response, input) : fallback

    return NextResponse.json({ success: true, data })
  } catch (error) {
    // Should not happen — executeAgentSafe absorbs AI errors.
    // This catch covers auth/JSON parse failures only.
    console.error('[parse-inquiry] Unexpected error:', error)
    return NextResponse.json({ success: false, error: 'Napaka pri obdelavi zahteve.' }, { status: 500 })
  }
}
