/**
 * AI Inquiry Analyzer
 *
 * POST /api/ai/analyze-inquiry
 *
 * Analyzes a customer inquiry (povpraševanje) and returns:
 *   - Slovenian summary of key points
 *   - Estimated materials list
 *   - Estimated duration
 *   - Red flags for the partner
 *
 * Available to all authenticated obrtniki (START and above).
 * Results are NOT cached here; the caller may add a client-side cache
 * keyed by inquiryId to avoid duplicate requests in the same session.
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

    // 2. Verify partner profile exists
    const { data: partner } = await supabase
      .from('obrtnik_profiles')
      .select('id, subscription_tier')
      .eq('id', user.id)
      .maybeSingle()

    if (!partner) {
      return NextResponse.json({ error: 'Profil obrtnika ni najden' }, { status: 403 })
    }

    // 3. Parse body
    const { inquiryId, title, description } = await request.json()

    if (!title && !description) {
      return NextResponse.json({ error: 'Manjkajo podatki o povpraševanju' }, { status: 400 })
    }

    // 4. Build prompt (Slovenian output)
    const prompt = `Si asistent za slovensko platformo LiftGO, ki povezuje obrtnike s strankami.
Analiziraj naslednje povpraševanje stranke in odgovori SAMO v JSON formatu brez markdown.

Naslov: ${title || 'Ni navedeno'}
Opis: ${description || 'Ni navedeno'}

Vrni natanko ta JSON objekt (nič drugega):
{
  "summary": "Kratek povzetek ključnih točk povpraševanja v 2-3 stavkih v slovenščini",
  "materials": ["Material 1", "Material 2"],
  "duration": "Ocenjeno trajanje dela, npr. '2-4 ure' ali '1-2 dni'",
  "redFlags": ["Opozorilo 1 če obstaja"]
}

Pravila:
- summary: jasna in koristna za obrtnika
- materials: 3-6 najpogostejših materialov za to vrsto dela (prazno polje [] če ni jasno)
- duration: realistična ocena
- redFlags: posebnosti ki zahtevajo pozornost (npr. nujnost, nizek budget, nejasno delo); prazno polje [] če ni opozoril`

    // 5. Call Claude
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // cost-efficient for summaries
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    // Strip markdown code fences if model wraps in them
    const jsonStr = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    let analysis: { summary: string; materials: string[]; duration: string; redFlags: string[] }

    try {
      analysis = JSON.parse(jsonStr)
    } catch {
      // Fallback: return the raw text as summary if JSON parse fails
      analysis = {
        summary: raw || 'Analiza ni bila uspešna.',
        materials: [],
        duration: 'Ni znano',
        redFlags: [],
      }
    }

    return NextResponse.json({ success: true, analysis })
  } catch (error) {
    console.error('[analyze-inquiry] error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Napaka pri analizi' },
      { status: 500 }
    )
  }
}
