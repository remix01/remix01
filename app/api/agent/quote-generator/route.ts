/**
 * Quote Generator Agent — AI-generated offer draft for a specific inquiry
 *
 * Wrapper around the partner quick-quote logic, accessible as an agent endpoint.
 * Takes povprasevanjeId + optional hourlyRate and returns a ready-to-use draft.
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

    const limitCheck = await enforceLimit(user.id)
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.errorMsg }, { status: 429 })
    }

    const { povprasevanjeId, hourlyRate, includeUpsell = true } = await req.json()
    if (!povprasevanjeId) {
      return NextResponse.json({ error: 'ID povpraševanja je obvezen.' }, { status: 400 })
    }

    // Load obrtnik profile
    const { data: obrtnikProfile } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, description, avg_rating, total_reviews, is_verified')
      .eq('user_id', user.id)
      .single()

    if (!obrtnikProfile) {
      return NextResponse.json({ error: 'Profil mojstra ni najden.' }, { status: 403 })
    }

    // Load povpraševanje
    const { data: povprasevanje } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, title, description, category, urgency, budget_min, budget_max, location_city')
      .eq('id', povprasevanjeId)
      .single()

    if (!povprasevanje) {
      return NextResponse.json({ error: 'Povpraševanje ni najdeno.' }, { status: 404 })
    }

    const rateHint = hourlyRate ? `Urna postavka: ${hourlyRate}€/h.` : ''
    const upsellHint = includeUpsell ? 'Vključi 1-2 predloga za nadgradnjo ali sorodne storitve.' : ''

    const prompt = `Si izkušen mojster na platformi LiftGO. Sestavi profesionalen osnutek ponudbe.

POVPRAŠEVANJE:
- Naslov: ${povprasevanje.title}
- Kategorija: ${povprasevanje.category ?? 'ni določena'}
- Opis: ${povprasevanje.description}
- Nujnost: ${povprasevanje.urgency ?? 'ni določena'}
- Lokacija: ${povprasevanje.location_city ?? 'ni določena'}
- Proračun: ${povprasevanje.budget_min ?? '?'}–${povprasevanje.budget_max ?? '?'} €

PROFIL MOJSTRA:
- Ime: ${obrtnikProfile.business_name}
- Opis: ${obrtnikProfile.description ?? 'ni na voljo'}
- Ocena: ${obrtnikProfile.avg_rating ?? 'ni ocen'} (${obrtnikProfile.total_reviews ?? 0} ocen)
- Verificiran: ${obrtnikProfile.is_verified ? 'da' : 'ne'}
${rateHint}

${upsellHint}

Odgovori IZKLJUČNO z veljavnim JSON objektom (brez markdown):
{
  "draftMessage": "celotno sporočilo ponudbe (slovensko, 80-150 besed)",
  "priceEstimate": <število ali null>,
  "priceType": "fiksna" | "ocena" | "po-ogledu",
  "priceRationale": "kratka razlaga cene (1-2 stavka)",
  "upsellSuggestions": ["predlog1", "predlog2"],
  "confidence": "visoka" | "srednja" | "nizka"
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      messages: [{ role: 'user', content: prompt }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    let result
    try {
      result = JSON.parse(raw.replace(/^```json\n?/, '').replace(/\n?```$/, ''))
    } catch {
      return NextResponse.json({ error: 'Napaka pri obdelavi odgovora AI.' }, { status: 500 })
    }

    await trackTokens({
      userId: user.id,
      agentName: 'quote-generator',
      model: 'claude-haiku-4-5-20251001',
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      metadata: { povprasevanjeId },
    })

    return NextResponse.json(result)
  } catch (err: any) {
    console.error('[quote-generator]', err)
    return NextResponse.json({ error: err.message ?? 'Napaka strežnika.' }, { status: 500 })
  }
}
