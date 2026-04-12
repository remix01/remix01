/**
 * AI Quick Reply Generator
 *
 * POST /api/ai/generate-replies
 *
 * Generates 3 context-aware reply suggestions in Slovenian for a partner
 * responding to a customer inquiry.
 *
 * Body:
 *   - inquiryTitle: string
 *   - inquiryDescription: string | null
 *
 * Returns:
 *   { replies: string[] }  (always 3 items)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (!user || authError) {
      return NextResponse.json({ error: 'Neoverjeni' }, { status: 401 })
    }

    // 2. Verify partner profile
    const { data: partner } = await supabase
      .from('obrtnik_profiles')
      .select('id, business_name')
      .eq('id', user.id)
      .maybeSingle()

    if (!partner) {
      return NextResponse.json({ error: 'Profil obrtnika ni najden' }, { status: 403 })
    }

    // 3. Parse body
    const { inquiryTitle, inquiryDescription } = await request.json()

    if (!inquiryTitle && !inquiryDescription) {
      return NextResponse.json({ error: 'Manjkajo podatki o povpraševanju' }, { status: 400 })
    }

    // 4. Build prompt
    const prompt = `Si izkušen obrtnik na slovenski platformi LiftGO.
Stranka je oddala naslednje povpraševanje:

Naslov: ${inquiryTitle || 'Ni navedeno'}
Opis: ${inquiryDescription || 'Ni navedeno'}

Sestavi TOČNO 3 kratke, profesionalne odgovore v slovenščini, ki bi jih obrtnik poslal stranki.
Odgovori naj bodo:
- Kratki (1-3 stavki)
- Prijazni in profesionalni
- Konkretni (vsak z drugačnim poudarkom: npr. razpoložljivost, cena, potreba po ogledu)

Vrni SAMO JSON polje z nizi brez markdown ali drugega besedila:
["Odgovor 1", "Odgovor 2", "Odgovor 3"]`

    // 5. Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // cost-efficient
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '[]'
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

    let replies: string[]
    try {
      replies = JSON.parse(jsonStr)
      if (!Array.isArray(replies)) replies = []
    } catch {
      replies = []
    }

    // Ensure exactly 3 replies; pad with safe defaults if model returned fewer
    if (replies.length < 3) {
      const defaults = [
        'Pozdravljeni! Ogledal si bom povpraševanje in vas kontaktiral v kratkem.',
        'Z veseljem vam pomagam. Ali mi lahko sporočite, kdaj bi bil pregled mogoč?',
        'Hvala za povpraševanje. Pošiljam okvirno ponudbo na podlagi opisa.',
      ]
      while (replies.length < 3) {
        replies.push(defaults[replies.length])
      }
    }

    return NextResponse.json({ success: true, replies: replies.slice(0, 3) })
  } catch (error) {
    console.error('[generate-replies] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Napaka pri generiranju odgovorov' },
      { status: 500 }
    )
  }
}
