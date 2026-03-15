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

// GET — load conversation history for the current user
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

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

// POST — send a message, get AI response, persist both
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Agent ni konfiguriran.' }, { status: 503 })
    }

    const { message } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Sporočilo je obvezno.' }, { status: 400 })
    }

    // Load existing conversation from DB
    const { data: conv } = await supabaseAdmin
      .from('agent_conversations')
      .select('messages')
      .eq('user_id', user.id)
      .maybeSingle()

    const history: StoredMessage[] = Array.isArray(conv?.messages) ? conv.messages : []

    // Rate limiting — max RATE_LIMIT_PER_HOUR user messages per hour
    const oneHourAgo = Date.now() - 3_600_000
    const recentUserMessages = history.filter(m => m.role === 'user' && m.timestamp > oneHourAgo)
    if (recentUserMessages.length >= RATE_LIMIT_PER_HOUR) {
      return NextResponse.json(
        { error: `Prekoračili ste omejitev ${RATE_LIMIT_PER_HOUR} sporočil na uro. Poskusite čez eno uro.` },
        { status: 429 }
      )
    }

    // Build Claude message array (no timestamps — just role/content)
    const claudeMessages = history.map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }))

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const systemPrompt = `Si LiftGO asistent za Slovenijo.
Pomagaš strankam najti prave mojstre za njihova dela.
Odgovarjaš kratko in jasno v slovenščini.
Ko stranka opiše problem, vprašaj:
1. Kje se nahaja (mesto)?
2. Kako nujno je?
3. Ali ima okvirni proračun?
Nato jim ponudi da oddajo povpraševanje na /narocnik/novo-povprasevanje`

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

    // Persist both messages to DB
    const updatedHistory: StoredMessage[] = [
      ...history,
      { role: 'user', content: message, timestamp: Date.now() },
      { role: 'agent', content: assistantText, timestamp: Date.now() },
    ]

    await supabaseAdmin
      .from('agent_conversations')
      .upsert({ user_id: user.id, messages: updatedHistory }, { onConflict: 'user_id' })

    return NextResponse.json({ message: assistantText })
  } catch (error) {
    console.error('[agent/chat] error:', error)
    const msg = anthropicErrorMessage(error)
    const status = error instanceof Anthropic.APIError ? error.status : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
