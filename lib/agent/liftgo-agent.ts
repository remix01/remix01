import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface MatchResult {
  obrtknikId: string
  businessName: string
  score: number
  reasons: string[]
  estimatedPrice?: string
}

export interface MatchingResponse {
  topMatches: MatchResult[]
  reasoning: string
  error?: string
}

export async function matchObrtnikiForPovprasevanje(
  povprasevanjeId: string
): Promise<MatchingResponse> {
  try {
    const supabase = await createClient()

    // 1. Fetch povprasevanje with full details
    const { data: povprasevanje, error: povError } = await supabase
      .from('povprasevanja')
      .select(`
        *,
        category:categories(name, slug),
        narocnik:profiles!povprasevanja_narocnik_id_fkey(full_name, location_city)
      `)
      .eq('id', povprasevanjeId)
      .single()

    if (povError || !povprasevanje) {
      return {
        topMatches: [],
        reasoning: '',
        error: 'Povpraševanja ni bilo mogoče naložiti',
      }
    }

    // 2. Fetch available obrtnike for that category
    const { data: obrtnikiData, error: obrError } = await supabase
      .from('obrtnik_profiles')
      .select(`
        *,
        profile:profiles(full_name, location_city),
        obrtnik_categories(
          category:categories(name, slug)
        )
      `)
      .eq('is_verified', true)
      .eq('is_available', true)
      .order('avg_rating', { ascending: false })
      .limit(20)

    if (obrError || !obrnikaData) {
      return {
        topMatches: [],
        reasoning: '',
        error: 'Obrtnike ni bilo mogoče naložiti',
      }
    }

    if (!obrnikaData || obrnikaData.length === 0) {
      return {
        topMatches: [],
        reasoning: 'V tej kategoriji trenutno ni razpoložljivih obrtnov.',
        error: 'Ni razpoložljivih obrtnov',
      }
    }

    // 3. Build prompts for Claude
    const systemPrompt = `Ti si AI agent za platformo LiftGO, ki povezuje naročnike z obrtniki v Sloveniji. 
Tvoja naloga je izbrati najboljše obrtnike za specifično povpraševanje.

Kriteriji za ocenjevanje (po prioriteti):
1. Ustreznost kategorije storitve (obvezno)
2. Lokacija — bližina naročnika (višja prioriteta)
3. Povprečna ocena (avg_rating)
4. Odzivnost (response_time_hours — nižje je boljše)
5. Razpoložljivost (is_available = true)

Vrni SAMO JSON brez dodatnega teksta.`

    const userPrompt = `POVPRAŠEVANJE:
- Naslov: ${povprasevanje.title}
- Opis: ${povprasevanje.description}
- Kategorija: ${povprasevanje.category?.name || 'N/A'}
- Lokacija naročnika: ${povprasevanje.location_city}
- Nujnost: ${povprasevanje.urgency}
- Proračun: ${
      povprasevanje.budget_min && povprasevanje.budget_max
        ? `${povprasevanje.budget_min}-${povprasevanje.budget_max} EUR`
        : 'ni določen'
    }

RAZPOLOŽLJIVI OBRTNIKI:
${JSON.stringify(
  (obrnikaData || []).map((o: any) => ({
    id: o.id,
    businessName: o.business_name,
    city: o.profile?.location_city,
    rating: o.avg_rating,
    totalReviews: o.total_reviews,
    responseTime: o.response_time_hours,
    categories: o.obrtnik_categories?.map((c: any) => c.category?.name),
  })),
  null,
  2
)}

Izberi TOP 3 obrtnike, ki najbolje ustrezajo povpraševanju.
Vrni JSON v tej obliki (SAMO JSON, brez drugega teksta):
{
  "matches": [
    {
      "obrtknikId": "uuid",
      "businessName": "ime podjetja",
      "score": 85,
      "reasons": ["Razlog 1", "Razlog 2"],
      "estimatedPrice": "50-80 EUR"
    }
  ],
  "reasoning": "Kratka razlaga izbire v slovenščini (2-3 stavki)"
}`

    // 4. Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: userPrompt }],
      system: systemPrompt,
    })

    // 5. Parse JSON response
    const content = response.content[0]
    if (content.type !== 'text') {
      return {
        topMatches: [],
        reasoning: '',
        error: 'Neveljavna odgovora od agenta',
      }
    }

    // Extract JSON from response (handle wrapped in code blocks)
    let jsonText = content.text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.slice(7)
    }
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.slice(3)
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.slice(0, -3)
    }
    jsonText = jsonText.trim()

    const parsed = JSON.parse(jsonText)
    const topMatches: MatchResult[] = (parsed.matches || []).slice(0, 3)

    return {
      topMatches,
      reasoning: parsed.reasoning || 'Agent je izbral najboljše obrtnike za vaše povpraševanje.',
    }
  } catch (error) {
    console.error('[v0] Agent error:', error)
    return {
      topMatches: [],
      reasoning: '',
      error: error instanceof Error ? error.message : 'Neznana napaka',
    }
  }
}
