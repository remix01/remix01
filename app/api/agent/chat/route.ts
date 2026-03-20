import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function anthropicErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 401) return 'Neveljaven API ključ. Preverite nastavitve.'
    if (error.status === 429) return 'Presegli ste omejitev AI poizvedb. Poskusite čez minuto.'
    if (error.status === 529) return 'AI strežnik je preobremenjen. Poskusite čez trenutek.'
    return `Napaka AI (${error.status}): ${error.message}`
  }
  return 'Napaka pri procesiranju. Poskusite znova.'
}

const RATE_LIMIT_PER_HOUR = 20

type StoredMessage = {
  role: 'user' | 'agent'
  content: string
  timestamp: number
}

// GET — load conversation history (empty for unauthenticated visitors)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Unauthenticated visitors get empty history (no persistence)
    if (!user) return NextResponse.json({ messages: [] })

    const { data } = await supabaseAdmin
      .from('agent_conversations')
      .select('messages')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ messages: data?.messages ?? [] })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

// DELETE — clear conversation history
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    await supabaseAdmin
      .from('agent_conversations')
      .delete()
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Napaka pri brisanju.' }, { status: 500 })
  }
}

const ANON_MESSAGE_LIMIT = 3

// POST — send a message, get AI response
// Authenticated users: full history persisted to DB, 20 msg/hour limit
// Anonymous visitors: in-request context only, 3 msg limit
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Agent ni konfiguriran.' }, { status: 503 })
    }

    const { message, anonHistory } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Sporočilo je obvezno.' }, { status: 400 })
    }

    let history: StoredMessage[] = []

    if (user) {
      // Authenticated: load from DB
      const { data: conv } = await supabaseAdmin
        .from('agent_conversations')
        .select('messages')
        .eq('user_id', user.id)
        .maybeSingle()
      history = Array.isArray(conv?.messages) ? conv.messages : []

      // Rate limit for authenticated users
      const oneHourAgo = Date.now() - 3_600_000
      const recentUserMessages = history.filter(m => m.role === 'user' && m.timestamp > oneHourAgo)
      if (recentUserMessages.length >= RATE_LIMIT_PER_HOUR) {
        return NextResponse.json(
          { error: `Prekoračili ste omejitev ${RATE_LIMIT_PER_HOUR} sporočil na uro. Poskusite čez eno uro.` },
          { status: 429 }
        )
      }
    } else {
      // Anonymous: use client-provided history (no DB), limit to 3 messages
      history = Array.isArray(anonHistory) ? anonHistory.slice(-10) : []
      const userMsgCount = history.filter(m => m.role === 'user').length
      if (userMsgCount >= ANON_MESSAGE_LIMIT) {
        return NextResponse.json(
          { error: `Brezplačni klepet je omejen na ${ANON_MESSAGE_LIMIT} sporočila. Za nadaljevanje se prijavite.`, requiresLogin: true },
          { status: 429 }
        )
      }
    }

    // Build Claude message array
    const claudeMessages = history.map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }))

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `Si LiftGO asistent za Slovenijo.
Pomagaš strankam najti prave mojstre za njihova dela ter obratno.
Odgovarjaš kratko in jasno v slovenščini.
Ko stranka opiše problem, vprašaj:
1. Kje se nahaja (mesto)?
2. Kako nujno je?
3. Ali ima okvirni proračun?

Pravilne povezave za uporabnike:
- Za oddajo povpraševanja: /#oddaj-povprasevanje (forma na domači strani)
- Za pregled mojstrov: /mojstri
- Za informacije kako deluje: /kako-deluje
- Za obrtnike ki želijo postati partnerji: /za-obrtnike

NIKOLI ne uporabi teh napačnih poti:
- /narocnik/... (napačno)
- /novo-povprasevanje/obrazec (napačno)`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: systemPrompt,
      messages: [...claudeMessages, { role: 'user', content: message }],
    })

    const assistantText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    if (user) {
      // Persist to DB for authenticated users
      const updatedHistory: StoredMessage[] = [
        ...history,
        { role: 'user', content: message, timestamp: Date.now() },
        { role: 'agent', content: assistantText, timestamp: Date.now() },
      ]
      await supabaseAdmin
        .from('agent_conversations')
        .upsert({ user_id: user.id, messages: updatedHistory }, { onConflict: 'user_id' })
    }

    return NextResponse.json({ message: assistantText })
  } catch (error) {
    console.error('[agent/chat] error:', error)
    const msg = anthropicErrorMessage(error)
    const status = error instanceof Anthropic.APIError ? error.status : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
