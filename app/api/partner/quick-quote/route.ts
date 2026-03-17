/**
 * Quick Quote Generator — contextual offer draft from a specific inquiry
 *
 * Unlike /api/partner/generate-offer (manual form), this takes a povprasevanjeId
 * and auto-reads inquiry + obrtnik profile to produce a ready-to-send draft.
 * Includes cross-sell suggestions.
 *
 * Plan: start & pro (free tier gets basic, pro gets expanded)
 */

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

    // Verify obrtnik profile
    const { data: obrtnikProfile } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, description, avg_rating, total_reviews, is_verified')
      .eq('user_id', user.id)
      .single()

    if (!obrtnikProfile) {
      return NextResponse.json({ error: 'Profil mojstra ni najden.' }, { status: 403 })
    }

    // Check monthly token limit
    const limitCheck = await enforceLimit(user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.errorMsg }, { status: 429 })
    }

    const { povprasevanjeId, hourlyRate, includeUpsell = true } = await req.json()
    if (!povprasevanjeId) {
      return NextResponse.json({ error: 'ID povpraševanja je obvezen.' }, { status: 400 })
    }

    // Load inquiry details
    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select(`
        id, title, description, urgency, location_city,
        budget_min, budget_max, preferred_date_from, preferred_date_to,
        category:categories(name, slug)
      `)
      .eq('id', povprasevanjeId)
      .single()

    if (!pov) return NextResponse.json({ error: 'Povpraševanje ni najdeno.' }, { status: 404 })

    // Load obrtnik's pricing rules for this category
    const cat = pov.category as any

    const systemPrompt = `Si LiftGO asistent za hitro pripravo ponudb v Sloveniji.
Pišeš profesionalne ponudbe za mojstre (obrtnike) slovenskim strankam.
Pišeš kratko, jasno in profesionalno v slovenščini.
Odgovori SAMO v JSON formatu brez markdown blokov.`

    const userPrompt = `Pripravi ponudbo za naslednje povpraševanje:

PODATKI O DELU:
- Kategorija: ${cat?.name || 'N/A'}
- Naslov: ${pov.title}
- Opis: ${pov.description}
- Nujnost: ${pov.urgency}
- Lokacija: ${pov.location_city}
- Proračun stranke: ${pov.budget_min ? `${pov.budget_min} - ${pov.budget_max || '?'} EUR` : 'Ni naveden'}
- Željeni termin: ${pov.preferred_date_from ? new Date(pov.preferred_date_from).toLocaleDateString('sl-SI') : 'Ni naveden'}

PODATKI O MOJSTRU:
- Ime podjetja: ${obrtnikProfile.business_name}
- Opis storitev: ${obrtnikProfile.description || 'N/A'}
- Urna postavka: ${hourlyRate ? `${hourlyRate} EUR/uro` : 'ni podana'}
- Ocena: ${obrtnikProfile.avg_rating?.toFixed(1) || 'N/A'}/5 (${obrtnikProfile.total_reviews || 0} ocen)

Vrni JSON:
{
  "draftMessage": "besedilo sporočila stranki (2-4 stavki)",
  "priceEstimate": 150,
  "priceType": "fiksna|ocena|po_ogledu",
  "priceRationale": "zakaj ta cena",
  "suggestedDate": "YYYY-MM-DD ali null",
  "estimatedDuration": "npr. 2-3 ure",
  "upsellSuggestions": [
    { "title": "dodatna storitev", "description": "kratek opis", "priceEstimate": 50 }
  ],
  "confidence": "visoka|srednja|nizka",
  "notes": "opomba za mojstra (interno)"
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    // Track token usage (non-blocking)
    const usage = response.usage
    trackTokens({
      userId: user.id,
      agentName: 'quote-generator',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      metadata: { povprasevanjeId },
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    let quote
    try {
      quote = JSON.parse(text)
    } catch {
      quote = {
        draftMessage: text.slice(0, 500),
        priceEstimate: null,
        priceType: 'po_ogledu',
        upsellSuggestions: [],
        confidence: 'nizka',
      }
    }

    if (!includeUpsell) quote.upsellSuggestions = []

    return NextResponse.json({ quote })
  } catch (error) {
    console.error('[partner/quick-quote] error:', error)
    return NextResponse.json({ error: 'Napaka pri generiranju ponudbe.' }, { status: 500 })
  }
}
