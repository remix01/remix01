/**
 * Materials & Supplies Agent
 *
 * Takes a job description + category, suggests a structured material list
 * with estimated quantities and approximate Slovenian market prices.
 * No external supplier API integration (uses Claude's knowledge of SLO market).
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { trackTokens, enforceLimit } from '@/lib/agent/tokenTracker'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Agent ni konfiguriran.' }, { status: 503 })
    }

    const limitCheck = await enforceLimit(user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.errorMsg }, { status: 429 })
    }

    const { description, category, area, complexity } = await req.json()
    if (!description?.trim()) {
      return NextResponse.json({ error: 'Opis dela je obvezen.' }, { status: 400 })
    }

    const systemPrompt = `Si LiftGO asistent za materiale in zaloge v Sloveniji.
Pomagaš mojstrom načrtovati material za dela.
Poznaš cene materialov v slovenskih trgovinah (Merkur, Bauhaus, Hofer, Leroy Merlin).
Navajaj realistične okvirne cene v EUR.
Odgovori SAMO v JSON formatu brez markdown blokov.`

    const userPrompt = `Delo: ${description}
Kategorija: ${category || 'splošno'}
${area ? `Površina/obseg: ${area}` : ''}
${complexity ? `Zahtevnost: ${complexity}` : ''}

Pripravi seznam potrebnega materiala. Vrni JSON:
{
  "materials": [
    {
      "name": "ime materiala",
      "description": "kratek opis",
      "quantity": "1.5",
      "unit": "m2|kos|liter|kg|m",
      "pricePerUnit": 12.50,
      "totalPrice": 18.75,
      "supplier": "Merkur|Bauhaus|Leroy Merlin|splošno",
      "notes": "opomba če relevantna",
      "isOptional": false
    }
  ],
  "totalEstimate": 250.00,
  "laborHoursEstimate": 4,
  "summary": "kratki povzetek (1-2 stavki)",
  "importantNotes": ["opomba 1", "opomba 2"],
  "ordersuggestedSuppliers": ["Merkur", "Bauhaus"]
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const usage = response.usage
    trackTokens({
      userId: user.id,
      agentName: 'materials',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      metadata: { category },
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    let result
    try {
      result = JSON.parse(text)
    } catch {
      result = { materials: [], totalEstimate: 0, summary: text.slice(0, 300) }
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[agent/materials] error:', error)
    return NextResponse.json({ error: 'Napaka pri pripravi seznama materialov.' }, { status: 500 })
  }
}
