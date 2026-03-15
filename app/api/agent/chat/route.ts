import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// Module-level singleton — one client for the lifetime of the serverless instance
let _client: Anthropic | null = null
function getClient(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) throw new Error('[chat] ANTHROPIC_API_KEY is not configured')
    _client = new Anthropic({ apiKey: key })
  }
  return _client
}

// Max conversation turns kept in context (keeps costs & latency low)
const MAX_HISTORY = 10

const SYSTEM_PROMPT = `Si LiftGO asistent za Slovenijo.
Pomagaš strankam najti prave mojstre za njihova dela.
Odgovarjaš kratko in jasno v slovenščini.
Ko stranka opiše problem, vprašaj:
1. Kje se nahaja (mesto)?
2. Kako nujno je?
3. Ali ima okvirni proračun?
Nato jim ponudi da oddajo povpraševanje na /narocnik/novo-povprasevanje`

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'Agent ni konfiguriran.' },
      { status: 503 }
    )
  }

  try {
    const { message, conversationHistory = [] } = await req.json()

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json(
        { error: 'Sporočilo je obvezno.' },
        { status: 400 }
      )
    }

    // Cap history to last MAX_HISTORY messages to avoid context overflow
    const cappedHistory = conversationHistory.slice(-MAX_HISTORY)

    const messages = [
      ...cappedHistory,
      { role: 'user' as const, content: message.trim() }
    ]

    const response = await getClient().messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    })

    const assistantMessage = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('')

    return NextResponse.json({
      message: assistantMessage,
      conversationHistory: [
        ...messages,
        { role: 'assistant' as const, content: assistantMessage }
      ]
    })

  } catch (error) {
    console.error('[chat] API error:', error)
    return NextResponse.json(
      { error: 'Napaka pri procesiranju. Poskusite znova.' },
      { status: 500 }
    )
  }
}
