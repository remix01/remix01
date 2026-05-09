import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai-cache'
import { selectModel, estimateCost } from '@/lib/model-router'
import { handleAuthError } from '@/lib/api/auth-errors'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { apiLimiter } from '@/lib/rate-limit/limiters'
import { loadAiUsageProfile, normalizeDailyUsageWindow, incrementDailyUsage } from '@/lib/agents/route-access-policy'
import { logAgentUsage } from '@/lib/agents/usage-logging'

function success(payload: Record<string, unknown>) {
  return NextResponse.json({ ok: true, data: payload, ...payload })
}

function fail(message: string, status: number, code: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      canonical_error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  )
}

function anthropicErrorMessage(error: unknown): string {
  if (error instanceof Anthropic.APIError) {
    if (error.status === 401) return 'Neveljaven API ključ. Preverite nastavitve.'
    if (error.status === 429) return 'Presegli ste omejitev AI poizvedb. Poskusite čez minuto.'
    if (error.status === 529) return 'AI strežnik je preobremenjen. Poskusite čez trenutek.'
    return `Napaka AI (${error.status}): ${error.message}`
  }
  return 'Napaka pri procesiranju. Poskusite znova.'
}

// Daily message limits per subscription tier
const TIER_LIMITS: Record<string, number> = {
  start: 20,
  pro: 200,
  elite: 500,
  enterprise: Infinity,
}

// Soft warning threshold (80% of limit)
const SOFT_LIMIT_RATIO = 0.8

const MAX_TOKENS = 500

type StoredMessage = {
  role: 'user' | 'agent'
  content: string
  timestamp: number
}

type UserPersona = 'narocnik' | 'obrtnik' | 'unknown'

type AssistantContext = {
  persona: UserPersona
  city?: string
  categories: string[]
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry || '').trim()).filter(Boolean)
}

async function getAssistantContext(userId: string): Promise<AssistantContext> {
  const [profileRes, craftProfileRes, inquiriesRes] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('city')
      .eq('id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, city, kategorije')
      .eq('id', userId)
      .maybeSingle(),
    supabaseAdmin
      .from('povprasevanja')
      .select('kategorija')
      .eq('narocnik_id', userId)
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const inquiryCategories = toStringArray((inquiriesRes.data || []).map((item) => item.kategorija))
  const craftCategories = toStringArray(craftProfileRes.data?.kategorije)
  const categories = Array.from(new Set([...craftCategories, ...inquiryCategories])).slice(0, 5)

  const persona: UserPersona = craftProfileRes.data?.id ? 'obrtnik' : profileRes.data ? 'narocnik' : 'unknown'
  const city = craftProfileRes.data?.city || profileRes.data?.city || undefined

  return { persona, city, categories }
}

function buildSystemPrompt(context: AssistantContext): string {
  const roleSpecificGuidance =
    context.persona === 'obrtnik'
      ? `Uporabnik je najverjetneje OBRTNIK.
- Pomagaj mu pridobiti več kakovostnih povpraševanj, napisati boljše ponudbe in uskladiti termine.
- Predlagaj konkretne korake v obrtnik nadzorni plošči (ponudbe, profil, razpoložljivost, termini).
- Pri cenah in obsegu dela opozori na transparentnost, realne roke in jasen opis materiala.`
      : context.persona === 'narocnik'
        ? `Uporabnik je najverjetneje NAROČNIK.
- Pomagaj mu pripraviti jasno povpraševanje, primerjati ponudbe in izbrati najboljšega obrtnika.
- Če manjkajo ključni podatki, vedno vprašaj za: lokacijo, nujnost, obseg dela, proračun.
- Predlagaj naslednji korak na platformi (oddaja povpraševanja, pregled mojstrov, primerjava ponudb).`
        : `Vloga uporabnika ni znana.
- Najprej ugotovi, ali je uporabnik naročnik ali obrtnik.
- Nato prilagodi nasvet vlogi.`

  const contextLine = [
    context.city ? `Mesto uporabnika: ${context.city}.` : null,
    context.categories.length ? `Pogoste kategorije: ${context.categories.join(', ')}.` : null,
  ]
    .filter(Boolean)
    .join(' ')

  return `Si LiftGO AI asistent za slovensko platformo domačih storitev.
Odgovarjaj kratko, praktično in v slovenščini (razen če uporabnik piše v drugem jeziku).
Vedno daj uporaben odgovor za TAKOJŠNJI naslednji korak na LiftGO platformi.

${roleSpecificGuidance}

${contextLine}

Pravila kakovosti odgovorov:
1) Najprej podaj kratek odgovor (2-5 stavkov), potem "Naslednji koraki" v točkah.
2) Če so informacije nepopolne, postavi največ 3 ključna vprašanja.
3) Ne izmišljuj si cen, rokov ali pravnih trditev. Če nisi prepričan, to jasno povej.
4) Ko je smiselno, usmeri na prave poti:
   - Oddaja povpraševanja: /#oddaj-povprasevanje
   - Pregled mojstrov: /mojstri
   - Kako deluje platforma: /kako-deluje
   - Za obrtnike/partnerje: /za-obrtnike
5) Nikoli ne predlagaj napačnih poti, kot sta /narocnik/... ali /novo-povprasevanje/obrazec.`
}

// GET — load conversation history (empty for unauthenticated visitors)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Handle auth errors
    if (error) {
      return handleAuthError(error)
    }
    if (!user) {
      return fail('Nepooblaščen dostop.', 401, 'UNAUTHORIZED')
    }

    const { data } = await supabaseAdmin
      .from('agent_conversations')
      .select('messages')
      .eq('user_id', user.id)
      .maybeSingle()

    return success({ messages: data?.messages ?? [] })
  } catch (error) {
    console.error('[agent/chat] GET error:', error)
    return handleAuthError(error)
  }
}

// DELETE — clear conversation history
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    // Handle auth errors
    if (error) {
      return handleAuthError(error)
    }
    if (!user) {
      return fail('Nepooblaščen dostop.', 401, 'UNAUTHORIZED')
    }

    await supabaseAdmin
      .from('agent_conversations')
      .delete()
      .eq('user_id', user.id)

    return success({ success: true })
  } catch (error) {
    console.error('[agent/chat] DELETE error:', error)
    return handleAuthError(error)
  }
}

const ANON_MESSAGE_LIMIT = 3

// POST — send a message, get AI response
// Authenticated users: full history persisted to DB, 20 msg/hour limit
// Anonymous visitors: in-request context only, 3 msg limit
async function postHandler(req: NextRequest, _context: { params: Promise<unknown> }) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    // Handle auth errors
    if (error) {
      return handleAuthError(error)
    }
    if (!user) {
      return fail('Nepooblaščen dostop.', 401, 'UNAUTHORIZED')
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return fail('Agent ni konfiguriran.', 503, 'AGENT_NOT_CONFIGURED')
    }

    const { message } = await req.json()
    if (!message?.trim()) {
      return fail('Sporočilo je obvezno.', 400, 'VALIDATION_ERROR')
    }

    // Load profile: subscription tier + daily usage via shared access policy
    const profile = await loadAiUsageProfile(user.id)
    const tier = (profile?.subscription_tier ?? 'start') as string
    const dailyLimit = TIER_LIMITS[tier] ?? TIER_LIMITS.start
    const usedToday = await normalizeDailyUsageWindow(user.id, profile)

    // Hard limit check
    if (usedToday >= dailyLimit) {
      return fail(
        `Dnevni limit dosežen (${dailyLimit}). ${tier === 'start' ? 'Nadgradite na PRO za 100 sporočil/dan.' : 'Poskusite jutri.'}`,
        429,
        'LIMIT_REACHED',
        { limit_reached: true, used: usedToday, limit: dailyLimit }
      )
    }

    // Soft limit warning
    const softLimitWarning =
      dailyLimit < Infinity && usedToday >= Math.floor(dailyLimit * SOFT_LIMIT_RATIO)
        ? `Opozorilo: Porabili ste ${usedToday}/${dailyLimit} dnevnih sporočil.`
        : null

    // Check Redis cache
    const cacheKey = buildCacheKey(message)
    const cached = await getCachedResponse(cacheKey)
    if (cached) {
      // Increment usage counter even for cached responses
      await incrementDailyUsage(user.id, usedToday + 1)

      // Log cached usage
      await logAgentUsage({
        userId: user.id,
        modelUsed: 'cached',
        tokensInput: 0,
        tokensOutput: 0,
        costUsd: 0,
        responseCached: true,
        messageHash: cacheKey,
        userMessage: message,
        messagePreviewLimit: 500,
      })

      // Persist to conversation
      const { data: conv } = await supabaseAdmin
        .from('agent_conversations')
        .select('messages')
        .eq('user_id', user.id)
        .maybeSingle()

      const history: StoredMessage[] = Array.isArray(conv?.messages) ? conv.messages : []
      await supabaseAdmin
        .from('agent_conversations')
        .upsert(
          {
            user_id: user.id,
            messages: [
              ...history,
              { role: 'user', content: message, timestamp: Date.now() },
              { role: 'agent', content: cached, timestamp: Date.now() },
            ],
          },
          { onConflict: 'user_id' }
        )

      return success({
        message: cached,
        cached: true,
        ...(softLimitWarning ? { warning: softLimitWarning } : {}),
        usage: { used: usedToday + 1, limit: dailyLimit === Infinity ? null : dailyLimit },
      })
    }

    // Select model based on complexity
    const modelSelection = selectModel(message)

    // Load conversation history
    const { data: conv } = await supabaseAdmin
      .from('agent_conversations')
      .select('messages')
      .eq('user_id', user.id)
      .maybeSingle()

    const history: StoredMessage[] = Array.isArray(conv?.messages) ? conv.messages : []

    const claudeMessages = history.map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }))

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const assistantContext = await getAssistantContext(user.id)
    const systemPrompt = buildSystemPrompt(assistantContext)

    const response = await client.messages.create({
      model: modelSelection.modelId,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [...claudeMessages, { role: 'user', content: message }],
    })

    const assistantText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd = estimateCost(modelSelection.modelId, inputTokens, outputTokens)

    // Cache the response
    await setCachedResponse(cacheKey, assistantText)

    // Update profile usage counters
    await incrementDailyUsage(user.id, usedToday + 1)

    // Increment lifetime totals (best-effort, non-blocking)
    Promise.resolve(supabaseAdmin
      .from('profiles')
      .select('ai_total_tokens_used, ai_total_cost_usd')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }: any) => {
        if (!data) return
        return supabaseAdmin
          .from('profiles')
          .update({
            ai_total_tokens_used: (data.ai_total_tokens_used ?? 0) + inputTokens + outputTokens,
            ai_total_cost_usd: Number((data.ai_total_cost_usd ?? 0)) + costUsd,
          })
          .eq('id', user.id)
      }))
      .catch(() => {})

    // Map full model ID to short name for DB CHECK constraint
    const modelShortName = modelSelection.modelId.includes('haiku') ? 'haiku-4' : 'sonnet-4'

    // Log usage
    await logAgentUsage({
      userId: user.id,
      modelUsed: modelShortName,
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
      costUsd,
      responseCached: false,
      messageHash: cacheKey,
      userMessage: message,
      messagePreviewLimit: 500,
    })

    // Persist conversation
    await supabaseAdmin
      .from('agent_conversations')
      .upsert(
        {
          user_id: user.id,
          messages: [
            ...history,
            { role: 'user', content: message, timestamp: Date.now() },
            { role: 'agent', content: assistantText, timestamp: Date.now() },
          ],
        },
        { onConflict: 'user_id' }
      )

    console.log(`[agent/chat] model=${modelSelection.modelId} reason=${modelSelection.reason} tokens=${inputTokens}+${outputTokens} cost=$${costUsd.toFixed(6)}`)

    return success({
      message: assistantText,
      cached: false,
      model: modelSelection.modelId,
      ...(softLimitWarning ? { warning: softLimitWarning } : {}),
      usage: { used: usedToday + 1, limit: dailyLimit === Infinity ? null : dailyLimit },
    })
  } catch (error) {
    console.error('[agent/chat] POST error:', error)
    
    // Check if it's an auth error
    if (error && typeof error === 'object' && ('code' in error || 'message' in error)) {
      return handleAuthError(error)
    }
    
    const msg = anthropicErrorMessage(error)
    const status = error instanceof Anthropic.APIError ? error.status : 500
    return fail(msg, status, error instanceof Anthropic.APIError ? 'AI_API_ERROR' : 'INTERNAL_ERROR')
  }
}

export const POST = withRateLimit(apiLimiter, postHandler)
