import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { executeAgent, AgentAccessError, QuotaExceededError } from '@/lib/ai/orchestrator'
import { isAgentAccessible, type AIAgentType } from '@/lib/agents/ai-router'
import { determineRouting } from '@/lib/ai/concierge-routing'
import { detectLanguage } from '@/lib/ai/concierge-language'
import type { ConciergeLanguage } from '@/lib/ai/concierge-types'
import { buildCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai-cache'

interface ConciergeRequest {
  message: string
  language?: ConciergeLanguage
  imageUrl?: string
  location?: {
    lat: number
    lng: number
    city?: string
  } | null
}

type UserRole = 'narocnik' | 'obrtnik' | 'guest'

async function getUserContext(userId: string) {
  const [recentInquiries, preferredCategories] = await Promise.all([
    supabaseAdmin
      .from('povprasevanja')
      .select('id, title, kategorija, created_at')
      .eq('narocnik_id', userId)
      .order('created_at', { ascending: false })
      .limit(3),
    supabaseAdmin
      .from('povprasevanja')
      .select('kategorija')
      .eq('narocnik_id', userId)
      .not('kategorija', 'is', null)
      .limit(10),
  ])

  const topCategories = Object.entries(
    (preferredCategories.data || []).reduce<Record<string, number>>((acc, item) => {
      const key = item.kategorija || 'Splošno'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([category]) => category)

  return {
    inquiries: recentInquiries.data || [],
    topCategories,
  }
}

async function getTier(userId: string): Promise<string> {
  const [{ data: profile }, { data: partner }] = await Promise.all([
    supabaseAdmin.from('profiles').select('subscription_tier').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('obrtnik_profiles').select('subscription_tier').eq('id', userId).maybeSingle(),
  ])

  return profile?.subscription_tier || partner?.subscription_tier || 'start'
}

async function getUserRole(userId: string): Promise<UserRole> {
  const [{ data: profile }, { data: partner }] = await Promise.all([
    supabaseAdmin.from('profiles').select('id').eq('id', userId).maybeSingle(),
    supabaseAdmin.from('obrtnik_profiles').select('id').eq('id', userId).maybeSingle(),
  ])

  if (partner?.id) return 'obrtnik'
  if (profile?.id) return 'narocnik'
  return 'guest'
}

function filterAgentsByTier(agents: AIAgentType[], tier: string) {
  return agents.filter((agent) => isAgentAccessible(agent, tier))
}

function buildWeatherSuggestion(language: ConciergeLanguage, city?: string) {
  const month = new Date().getUTCMonth() + 1
  if (month >= 10 || month <= 3) {
    const cityName = city || 'vašem kraju'
    const byLanguage: Record<ConciergeLanguage, string> = {
      sl: `V ${cityName} je sezona dežja/mraza — želite preventivni pregled strehe ali ogrevanja?`,
      en: `In ${cityName}, wet/cold season is active — want a roof or heating inspection?`,
      hr: `U ${cityName} je kišna/hladna sezona — trebate pregled krova ili grijanja?`,
      de: `In ${cityName} ist Regen-/Kältesaison — möchten Sie eine Dach- oder Heizungsprüfung?`,
      it: `A ${cityName} è stagione fredda/piovosa: vuoi un controllo tetto o riscaldamento?`,
    }
    return byLanguage[language]
  }
  return null
}

function buildGuestReply(language: ConciergeLanguage, message: string, intent: string) {
  const byLanguage: Record<ConciergeLanguage, string> = {
    sl: `Razumem vaše sporočilo: "${message}".\n\nPredlagan naslednji korak na LiftGO:\n• Oddajte povpraševanje: /#oddaj-povprasevanje\n• Ali preverite mojstre: /mojstri\n\nZa bolj natančno pomoč se prijavite. Ocenjen namen: ${intent}.`,
    en: `I understand your message: "${message}".\n\nSuggested next step on LiftGO:\n• Submit an inquiry: /#oddaj-povprasevanje\n• Or browse professionals: /mojstri\n\nSign in for more precise help. Detected intent: ${intent}.`,
    hr: `Razumijem vašu poruku: "${message}".\n\nPredloženi sljedeći korak na LiftGO:\n• Pošaljite upit: /#oddaj-povprasevanje\n• Ili pregledajte majstore: /mojstri\n\nPrijavite se za točniju pomoć. Procijenjena namjera: ${intent}.`,
    de: `Ich habe Ihre Nachricht verstanden: "${message}".\n\nEmpfohlener nächster Schritt auf LiftGO:\n• Anfrage senden: /#oddaj-povprasevanje\n• Oder Handwerker ansehen: /mojstri\n\nFür genauere Hilfe bitte anmelden. Erkannte Absicht: ${intent}.`,
    it: `Ho capito il tuo messaggio: "${message}".\n\nProssimo passo consigliato su LiftGO:\n• Invia richiesta: /#oddaj-povprasevanje\n• Oppure sfoglia i professionisti: /mojstri\n\nAccedi per supporto più preciso. Intento rilevato: ${intent}.`,
  }
  return byLanguage[language]
}

function buildFinalMessage(params: {
  language: ConciergeLanguage
  role: UserRole
  results: Array<{ agentType: AIAgentType; response: string }>
  latestInquiry?: { title?: string | null; kategorija?: string | null } | null
  proactiveSuggestion: string | null
}) {
  const introByLanguage: Record<ConciergeLanguage, string> = {
    sl: params.role === 'obrtnik' ? 'Predlog za obrtnika:' : 'Predlog za naročnika:',
    en: params.role === 'obrtnik' ? 'Suggested plan for craftsman:' : 'Suggested plan for customer:',
    hr: params.role === 'obrtnik' ? 'Prijedlog za majstora:' : 'Prijedlog za naručitelja:',
    de: params.role === 'obrtnik' ? 'Vorschlag für Handwerker:' : 'Vorschlag für Kunden:',
    it: params.role === 'obrtnik' ? 'Piano consigliato per artigiano:' : 'Piano consigliato per cliente:',
  }

  const cleanResponses = params.results
    .map((item) => item.response.trim())
    .filter(Boolean)
    .join('\n\n')

  const latestInquiryPrefixByLanguage: Record<ConciergeLanguage, string> = {
    sl: 'Vaše zadnje povpraševanje',
    en: 'Your latest inquiry',
    hr: 'Vaš zadnji upit',
    de: 'Ihre letzte Anfrage',
    it: 'La tua ultima richiesta',
  }

  const untitledByLanguage: Record<ConciergeLanguage, string> = {
    sl: 'brez naslova',
    en: 'untitled',
    hr: 'bez naslova',
    de: 'ohne Titel',
    it: 'senza titolo',
  }

  const generalCategoryByLanguage: Record<ConciergeLanguage, string> = {
    sl: 'Splošno',
    en: 'General',
    hr: 'Općenito',
    de: 'Allgemein',
    it: 'Generale',
  }

  const latestInquiryLine = params.latestInquiry
    ? `${latestInquiryPrefixByLanguage[params.language]}: ${params.latestInquiry.title || untitledByLanguage[params.language]} (${params.latestInquiry.kategorija || generalCategoryByLanguage[params.language]})`
    : null

  return [introByLanguage[params.language], cleanResponses, latestInquiryLine, params.proactiveSuggestion]
    .filter(Boolean)
    .join('\n\n')
}

export async function POST(req: NextRequest) {
  try {
    const body: ConciergeRequest = await req.json()
    const message = String(body.message || '').trim()

    if (!message) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 })
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const language = detectLanguage(message, body.language || 'sl')
    const cacheUserScope = user?.id || 'anonymous'
    const cacheKey = buildCacheKey(`concierge:${cacheUserScope}:${language}:${message}`)
    const cached = await getCachedResponse(cacheKey)
    if (cached) {
      return NextResponse.json({
        message: cached,
        language,
        cached: true,
        intent: 'cached',
        usedAgents: [],
      })
    }

    const routing = determineRouting(message, Boolean(body.imageUrl))

    if (!user) {
      return NextResponse.json({
        message: buildGuestReply(language, message, routing.intent),
        language,
        intent: routing.intent,
        usedAgents: [],
        canSubmitInquiry: true,
      })
    }

    const [userContext, tier, role] = await Promise.all([getUserContext(user.id), getTier(user.id), getUserRole(user.id)])
    const allowedAgents = filterAgentsByTier(routing.requiredAgents, tier)
    const fallbackAgents: AIAgentType[] =
      allowedAgents.length > 0 ? allowedAgents : (['work_description'] as AIAgentType[])

    const results = await Promise.all(
      fallbackAgents.map(async (agentType) => {
        try {
          const response = await executeAgent({
            userId: user.id,
            agentType,
            userMessage: message,
            imageUrl: body.imageUrl,
            additionalContext: JSON.stringify({ userContext, language, routingIntent: routing.intent }),
            useTools: true,
            useRAG: true,
          })
          return { agentType, response: response.response }
        } catch (error) {
          if (error instanceof AgentAccessError || error instanceof QuotaExceededError) {
            return { agentType, response: error.message }
          }
          return { agentType, response: 'Agent trenutno ni na voljo.' }
        }
      })
    )

    const proactiveSuggestion = buildWeatherSuggestion(language, body.location?.city)

    const finalMessage = buildFinalMessage({
      language,
      role,
      results,
      latestInquiry: userContext.inquiries[0],
      proactiveSuggestion,
    })

    await setCachedResponse(cacheKey, finalMessage)

    return NextResponse.json({
      message: finalMessage,
      language,
      intent: routing.intent,
      usedAgents: fallbackAgents,
      canSubmitInquiry: true,
      topCategories: userContext.topCategories,
    })
  } catch (error) {
    console.error('[ai/concierge] POST error:', error)
    return NextResponse.json({ error: 'Concierge failed.' }, { status: 500 })
  }
}
