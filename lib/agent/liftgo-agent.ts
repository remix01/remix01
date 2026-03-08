import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { MATCHING_RULES, AGENT_INSTRUCTIONS } from './skills/matching-rules'
import { getPricingForCategory } from './skills/pricing-rules'

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

export async function getAgentPricingEstimate(params: {
  categorySlug: string
  urgency: string
  isWeekend: boolean
}): Promise<{
  estimate: string
  notes: string
}> {
  try {
    const pricing = getPricingForCategory(params.categorySlug)
    let minPrice = pricing.minHourly
    let maxPrice = pricing.maxHourly

    // Apply weekend surcharge
    if (params.isWeekend) {
      minPrice = pricing.withWeekendSurcharge.min
      maxPrice = pricing.withWeekendSurcharge.max
    }

    // Apply urgent surcharge (on top of weekend if applicable)
    if (params.urgency === 'nujno') {
      const urgentMin = Math.round(minPrice * 1.15)
      const urgentMax = Math.round(maxPrice * 1.15)
      minPrice = urgentMin
      maxPrice = urgentMax
    }

    return {
      estimate: `${minPrice}-${maxPrice} EUR/uro`,
      notes: `Ocena AI agenta${params.isWeekend ? ' (vikend)' : ''}${params.urgency === 'nujno' ? ' (nujno)' : ''} — dejanska cena se lahko razlikuje`,
    }
  } catch (error) {
    return {
      estimate: '25-60 EUR/uro',
      notes: 'Splošna ocena — dejanska cena se lahko razlikuje',
    }
  }
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

    if (obrError || !obrtnikiData) {
      return {
        topMatches: [],
        reasoning: '',
        error: 'Obrtnike ni bilo mogoče naložiti',
      }
    }

    if (!obrtnikiData || obrtnikiData.length === 0) {
      return {
        topMatches: [],
        reasoning: 'V tej kategoriji trenutno ni razpoložljivih obrtnov.',
        error: 'Ni razpoložljivih obrtnov',
      }
    }

    // 3. Filter obrtniki by minimum requirements and urgency
    let filteredObrtniki = (obrtnikiData || []).filter((o: any) => {
      // Minimum rating requirement
      if ((o.avg_rating || 0) < MATCHING_RULES.minimumRequirements.minRating) {
        return false
      }

      // Must be verified
      if (MATCHING_RULES.minimumRequirements.mustBeVerified && !o.is_verified) {
        return false
      }

      // Must be available
      if (MATCHING_RULES.minimumRequirements.mustBeAvailable && !o.is_available) {
        return false
      }

      // Urgency filter: for 'nujno', only show obrtniki with <2h response time
      if (povprasevanje.urgency === 'nujno') {
        const minResponseTime = MATCHING_RULES.urgency.nujno.minResponseTimeHours
        if ((o.response_time_hours || 48) > minResponseTime) {
          return false
        }
      }

      return true
    })

    if (!filteredObrtniki || filteredObrtniki.length === 0) {
      return {
        topMatches: [],
        reasoning: 'V tej kategoriji in nujnosti trenutno ni razpoložljivih obrtnov.',
        error: 'Ni razpoložljivih obrtnov',
      }
    }

    // 4. Calculate pricing estimate
    const pricingEstimate = await getAgentPricingEstimate({
      categorySlug: povprasevanje.category?.slug || 'default',
      urgency: povprasevanje.urgency,
      isWeekend: [0, 6].includes(new Date().getDay()),
    })

    // 5. Build prompts for Claude with rules and instructions
    const systemPrompt = AGENT_INSTRUCTIONS

    const userPrompt = `MATCHING RULES TO FOLLOW:
${JSON.stringify(MATCHING_RULES, null, 2)}

POVPRAŠEVANJE:
- Naslov: ${povprasevanje.title}
- Opis: ${povprasevanje.description}
- Kategorija: ${povprasevanje.category?.name || 'N/A'}
- Lokacija naročnika: ${povprasevanje.location_city}
- Nujnost: ${povprasevanje.urgency}
- Okvirna cena: ${pricingEstimate.estimate}
- Proračun: ${
      povprasevanje.budget_min && povprasevanje.budget_max
        ? `${povprasevanje.budget_min}-${povprasevanje.budget_max} EUR`
        : 'ni določen'
    }

RAZPOLOŽLJIVI OBRTNIKI (že filtrirani):
${JSON.stringify(
  filteredObrtniki.map((o: any) => ({
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
      "estimatedPrice": "${pricingEstimate.estimate}"
    }
  ],
  "reasoning": "Kratka razlaga izbire v slovenščini (2-3 stavki)"
}`

    // 6. Call Claude API with error handling for missing API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        topMatches: [],
        reasoning: '',
        error: 'Agent ni konfiguriran — manka API ključ',
      }
    }

    let response
    try {
      response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: userPrompt }],
        system: systemPrompt,
      })
    } catch (apiError) {
      console.error('[v0] Claude API error:', apiError)
      return {
        topMatches: [],
        reasoning: '',
        error: 'Napaka pri komunikaciji z agentom — poskusite znova',
      }
    }

    // 7. Parse JSON response
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
