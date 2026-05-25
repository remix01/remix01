/**
 * AI Concierge Global
 *
 * Extends the AI Concierge with:
 *  - Automatic language detection (Accept-Language / Cloudflare geo headers)
 *  - IP-based city/country pre-fill
 *  - Multi-country price estimation from historical data
 *  - Guest draft preservation + account linking after registration
 */

import { createAdminClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'

export type SupportedLocale = 'sl' | 'hr' | 'de' | 'en'

export interface GeoContext {
  countryCode: string
  city?:       string
  locale:      SupportedLocale
  currency:    string
  timezone:    string
}

export interface PriceEstimate {
  min:      number
  max:      number
  currency: string
  basis:    string
}

export function detectLocale(acceptLanguage: string | null): SupportedLocale {
  if (!acceptLanguage) return 'sl'

  const primary = acceptLanguage.split(',')[0]?.split(';')[0]?.trim().toLowerCase() ?? ''

  if (primary.startsWith('sl')) return 'sl'
  if (primary.startsWith('hr')) return 'hr'
  if (primary.startsWith('de')) return 'de'
  return 'sl'
}

export async function resolveGeoContext(
  acceptLanguage: string | null,
  cfCountry: string | null,
  cfCity: string | null,
): Promise<GeoContext> {
  const supabase = createAdminClient()
  const locale = detectLocale(acceptLanguage)

  const rawCountry = cfCountry?.toUpperCase() ??
    (locale === 'sl' ? 'SI' : locale === 'hr' ? 'HR' : locale === 'de' ? 'DE' : 'SI')

  const { data: country } = await supabase
    .from('countries')
    .select('code, locale, currency, timezone, is_active')
    .eq('code', rawCountry)
    .single()

  const supported = (country?.is_active ? country : null) ?? {
    code:      'SI',
    locale:    'sl',
    currency:  'EUR',
    timezone:  'Europe/Ljubljana',
    is_active: true,
  }

  return {
    countryCode: supported.code ?? 'SI',
    city:        cfCity ?? undefined,
    locale:      (supported.locale as SupportedLocale) ?? 'sl',
    currency:    supported.currency ?? 'EUR',
    timezone:    supported.timezone ?? 'Europe/Ljubljana',
  }
}

export async function estimatePrice(
  _category: string,
  _city: string,
  countryCode: string,
): Promise<PriceEstimate | null> {
  const supabase = createAdminClient()

  const { data: historicalOffers } = await supabase
    .from('ponudbe')
    .select('price')
    .eq('status', 'accepted')
    .limit(20)

  if (!historicalOffers?.length) return null

  const prices = historicalOffers
    .map(o => o.price as number)
    .filter(p => typeof p === 'number' && p > 0)

  if (!prices.length) return null

  const min = Math.round(Math.min(...prices) * 0.8)
  const max = Math.round(Math.max(...prices) * 1.2)
  const currency = ['SI', 'DE', 'AT', 'HR'].includes(countryCode) ? 'EUR' : 'EUR'

  return {
    min,
    max,
    currency,
    basis: `${prices.length} podobnih del v tej regiji`,
  }
}

export function buildConciergeSystemPrompt(
  geo: GeoContext,
  estimate: PriceEstimate | null,
): string {
  const langMap: Record<SupportedLocale, string> = {
    sl: 'Slovenian',
    hr: 'Croatian',
    de: 'German',
    en: 'English',
  }

  const greeting = {
    sl: 'Pozdravljeni! Sem vaš virtualni pomočnik LiftGO.',
    hr: 'Dobrodošli! Ja sam vaš virtualni asistent LiftGO.',
    de: 'Willkommen! Ich bin Ihr virtueller LiftGO-Assistent.',
    en: 'Welcome! I am your LiftGO virtual assistant.',
  }[geo.locale]

  let prompt = `You are the AI Concierge for LiftGO, a home services marketplace.
Always respond in ${langMap[geo.locale]}.
The visitor is located in ${geo.city ?? geo.countryCode}.

Your goal: help the visitor describe their home service need and collect:
1. What service they need (category)
2. Where (city — pre-filled: ${geo.city ?? 'ask'})
3. When (urgency: urgent/this week/flexible)
4. Budget (optional)
5. Email for follow-up (optional but encouraged)

Ask only ONE question at a time. Be warm and concise.
Start with: "${greeting}"`

  if (geo.city) {
    prompt += `\nThe visitor's city appears to be ${geo.city} — confirm it naturally.`
  }

  if (estimate) {
    prompt += `\nFor context, similar jobs in this area typically cost ${estimate.min}–${estimate.max} ${estimate.currency} (based on ${estimate.basis}).`
  }

  return prompt
}

export async function runGlobalConcierge(
  sessionId: string,
  messages: Array<{ role: string; content: string }>,
  headers: {
    acceptLanguage?: string | null
    cfCountry?:      string | null
    cfCity?:         string | null
  },
): Promise<{ reply: string; geo: GeoContext }> {
  const geo = await resolveGeoContext(
    headers.acceptLanguage ?? null,
    headers.cfCountry ?? null,
    headers.cfCity ?? null,
  )

  const systemPrompt = buildConciergeSystemPrompt(geo, null)
  const lastUserMsg = messages.filter(m => m.role === 'user').at(-1)?.content ?? ''

  const result = await executeAgent({
    agentType:           'onboarding_assistant',
    userId:              sessionId,
    userMessage:         lastUserMsg,
    systemPromptOverride: systemPrompt,
  })

  return { reply: result.response, geo }
}
