import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { executeAgent, AgentAccessError, QuotaExceededError } from '@/lib/ai/orchestrator'
import { isAgentAccessible, type AIAgentType } from '@/lib/agents/ai-router'
import { determineRouting } from '@/lib/ai/concierge-routing'
import { detectLanguage } from '@/lib/ai/concierge-language'
import type { ConciergeLanguage } from '@/hooks/useLanguage'
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
      const guestReply = `${message}\n\nZa bolj točne rezultate se prijavite. Trenutno ocenjen namen: ${routing.intent}.`
      return NextResponse.json({
        message: guestReply,
        language,
        intent: routing.intent,
        usedAgents: [],
        canSubmitInquiry: true,
      })
    }

    const [userContext, tier] = await Promise.all([getUserContext(user.id), getTier(user.id)])
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

    const combined = results
      .map((item) => `[${item.agentType}] ${item.response}`)
      .join('\n\n')

    const finalMessage = [
      combined,
      userContext.inquiries.length
        ? `\nVaše zadnje povpraševanje: ${userContext.inquiries[0].title || 'brez naslova'} (${userContext.inquiries[0].kategorija || 'Splošno'})`
        : null,
      proactiveSuggestion,
    ]
      .filter(Boolean)
      .join('\n\n')

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
