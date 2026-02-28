import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Agent ni konfiguriran.' },
        { status: 503 }
      )
    }
    
    const { message, conversationHistory = [] } = await req.json()
    
    if (!message) {
      return NextResponse.json(
        { error: 'Sporočilo je obvezno.' },
        { status: 400 }
      )
    }
    
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    })
    
    const systemPrompt = `Si LiftGO asistent za Slovenijo. 
Pomagaš strankam najti prave mojstre za njihova dela.
Odgovarjaš kratko in jasno v slovenščini.
Ko stranka opiše problem, vprašaj:
1. Kje se nahaja (mesto)?
2. Kako nujno je?
3. Ali ima okvirni proračun?
Nato jim ponudi da oddajo povpraševanje na /narocnik/novo-povprasevanje`
    
    const messages = [
      ...conversationHistory,
      { role: 'user' as const, content: message }
    ]
    
    const response = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages
    })
    
    const assistantMessage = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as any).text)
      .join('')
    
    return NextResponse.json({
      message: assistantMessage,
      conversationHistory: [
        ...messages,
        { role: 'assistant' as const, content: assistantMessage }
      ]
    })
    
  } catch (error) {
    console.error('[v0] Chat API error:', error)
    return NextResponse.json(
      { error: 'Napaka pri procesiranju. Poskusite znova.' },
      { status: 500 }
    )
  }
}
