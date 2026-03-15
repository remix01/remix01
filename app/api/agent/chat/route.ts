import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'

export async function POST(req: NextRequest) {
  try {
    // Check API key
    if (!env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Agent ni konfiguriran.' },
        { status: 503 }
      )
    }

    // Optional auth — chatbot je dostopen vsem, prijavljeni dobijo personalizirano pomoč
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    const { message, conversationHistory = [] } = await req.json()
    
    if (!message) {
      return NextResponse.json(
        { error: 'Sporočilo je obvezno.' },
        { status: 400 }
      )
    }
    
    const client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY
    })
    
    const systemPrompt = `Si LiftGO asistent za Slovenijo. LiftGO je platforma, ki poveže stranke z zaupanja vrednimi obrtniki in mojstri.
Pomagaš uporabnikom (strankam in obrtnikom) z vprašanji o platformi.
Odgovarjaš kratko, prijazno in jasno VEDNO v slovenščini.

Ko stranka opiše problem ali potrebuje mojstra, jo vodi skozi:
1. Kakšno storitev potrebuje?
2. Kje se nahaja (mesto/regija)?
3. Kako nujno je?
4. Ali ima okvirni proračun?
Nato jo usmeri, da odda povpraševanje na /narocnik/novo-povprasevanje

Ko obrtnik vpraša o platformi, mu razloži kako deluje: registracija, potrjevanje, prejemanje povpraševanj.

${user ? `Uporabnik je prijavljen (ID: ${user.id}).` : 'Uporabnik ni prijavljen — ga usmeri k registraciji na /registracija ali prijavi na /prijava ko bo to relevantno.'}

Nikoli ne izmišljuj cen ali garancij. Če ne veš odgovora, reci da bo ekipa LiftGO pomagala na info@liftgo.net.`
    
    const messages = [
      ...conversationHistory,
      { role: 'user' as const, content: message }
    ]
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
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
