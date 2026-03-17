import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Agent ni konfiguriran.' }, { status: 503 })
    }

    const { keywords, category, existingDescription } = await req.json()
    if (!keywords?.trim()) {
      return NextResponse.json({ error: 'Ključne besede so obvezne.' }, { status: 400 })
    }

    const systemPrompt = `Si LiftGO asistent za pomoč pri opisovanju del v Sloveniji.
Pomagaš naročniku napisati jasno in popolno povpraševanje za mojstra.
Vedno odgovarjaš v slovenščini.
Tvoja naloga: na podlagi ključnih besed in kategorije pripravi:
1. Tri različice opisa: kratek (1-2 stavka), podroben (3-5 stavkov), tehničen (s tehničnimi detajli)
2. 2-3 dodatna vprašanja, ki bi razjasnila nejasnosti
Odgovori SAMO v JSON formatu brez markdown blokov.`

    const userPrompt = `Kategorija dela: ${category || 'splošno'}
Ključne besede: ${keywords}
${existingDescription ? `Obstoječi opis: ${existingDescription}` : ''}

Pripravi JSON z naslednjo strukturo:
{
  "variants": {
    "kratek": "kratek opis",
    "podroben": "podroben opis",
    "tehnicen": "tehnični opis"
  },
  "questions": ["vprašanje 1", "vprašanje 2", "vprašanje 3"],
  "suggestedTitle": "predlagani naslov"
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      // Fallback if JSON parsing fails
      return NextResponse.json({
        variants: {
          kratek: text.slice(0, 200),
          podroben: text,
          tehnicen: text,
        },
        questions: [],
        suggestedTitle: keywords,
      })
    }

    return NextResponse.json(parsed)
  } catch (error) {
    console.error('[agent/task-description] error:', error)
    return NextResponse.json({ error: 'Napaka pri generiranju opisa.' }, { status: 500 })
  }
}
