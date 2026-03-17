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
    if (!limitCheck.allowed) return NextResponse.json({ error: limitCheck.errorMsg }, { status: 429 })

    const { povprasevanjeId } = await req.json()
    if (!povprasevanjeId) {
      return NextResponse.json({ error: 'ID povpraševanja je obvezen.' }, { status: 400 })
    }

    // Verify ownership
    const { data: povprasevanje } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, narocnik_id, title')
      .eq('id', povprasevanjeId)
      .single()

    if (!povprasevanje || povprasevanje.narocnik_id !== user.id) {
      return NextResponse.json({ error: 'Ni dovoljenja.' }, { status: 403 })
    }

    // Load ponudbe with obrtnik info
    const { data: ponudbe } = await supabaseAdmin
      .from('ponudbe')
      .select(`
        id,
        message,
        price_estimate,
        price_type,
        available_date,
        status,
        created_at,
        obrtnik:obrtnik_profiles(
          business_name,
          avg_rating,
          total_reviews,
          is_verified,
          response_time_hours
        )
      `)
      .eq('povprasevanje_id', povprasevanjeId)
      .eq('status', 'poslana')

    if (!ponudbe || ponudbe.length < 2) {
      return NextResponse.json({ error: 'Za primerjavo potrebujete vsaj 2 ponudbi.' }, { status: 400 })
    }

    // Build comparison prompt
    const ponudbeText = ponudbe.map((p, i) => {
      const o = p.obrtnik as any
      return `Ponudba ${i + 1} (ID: ${p.id}):
- Mojster: ${o?.business_name || 'Neznan'}
- Ocena: ${o?.avg_rating?.toFixed(1) || 'N/A'}/5 (${o?.total_reviews || 0} ocen)
- Verificiran: ${o?.is_verified ? 'Da' : 'Ne'}
- Odzivni čas: ${o?.response_time_hours ? o.response_time_hours + 'h' : 'N/A'}
- Cena: ${p.price_estimate ? p.price_estimate + ' EUR' : 'Po dogovoru'} (${p.price_type === 'fiksna' ? 'fiksna' : p.price_type === 'ocena' ? 'ocena' : 'po ogledu'})
- Razpoložljivost: ${p.available_date ? new Date(p.available_date).toLocaleDateString('sl-SI') : 'Ni navedena'}
- Sporočilo: ${p.message?.slice(0, 300) || 'Ni sporočila'}`
    }).join('\n\n')

    const systemPrompt = `Si LiftGO asistent za primerjavo ponudb v Sloveniji.
Analiziraš ponudbe mojstrov in pomagaš stranki izbrati najboljšo.
Vedno odgovarjaš v slovenščini.
Odgovori SAMO v JSON formatu brez markdown blokov.`

    const userPrompt = `Analiziraj naslednje ponudbe za povpraševanje "${povprasevanje.title}":

${ponudbeText}

Pripravi JSON z naslednjo strukturo:
{
  "summary": "kratka analiza (2-3 stavki)",
  "recommendation": "ID priporočene ponudbe in razlog",
  "warnings": ["opozorilo 1", "opozorilo 2"],
  "comparison": [
    {
      "ponudbaId": "id",
      "businessName": "ime",
      "strengths": ["prednost 1", "prednost 2"],
      "weaknesses": ["slabost 1"],
      "valueScore": 7,
      "comment": "kratki komentar"
    }
  ],
  "avgPrice": 100,
  "priceRange": "80-150 EUR"
}`

    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    trackTokens({ userId: user.id, agentName: 'offer-comparison', model: 'claude-haiku-4-5-20251001', inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens, metadata: { povprasevanjeId } })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as any).text)
      .join('')

    let analysis
    try {
      analysis = JSON.parse(text)
    } catch {
      analysis = { summary: text, warnings: [], comparison: [], recommendation: '' }
    }

    return NextResponse.json({ analysis, ponudbe })
  } catch (error) {
    console.error('[agent/offer-comparison] error:', error)
    return NextResponse.json({ error: 'Napaka pri primerjavi ponudb.' }, { status: 500 })
  }
}
