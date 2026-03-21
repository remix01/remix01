import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai-cache'
import { selectModel, estimateCost } from '@/lib/model-router'
import { handleAuthError } from '@/lib/api/auth-errors'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { apiLimiter } from '@/lib/rate-limit/limiters'


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
  start: 5,
  pro: 100,
  elite: 300,
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
      return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })
    }

    const { data } = await supabaseAdmin
      .from('agent_conversations')
      .select('messages')
      .eq('user_id', user.id)
      .maybeSingle()

    return NextResponse.json({ messages: data?.messages ?? [] })
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
      return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })
    }

    await supabaseAdmin
      .from('agent_conversations')
      .delete()
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[agent/chat] DELETE error:', error)
    return handleAuthError(error)
  }
}

const ANON_MESSAGE_LIMIT = 3

// POST — send a message, get AI response
// Authenticated users: full history persisted to DB, 20 msg/hour limit
// Anonymous visitors: in-request context only, 3 msg limit
async function postHandler(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    // Handle auth errors
    if (error) {
      return handleAuthError(error)
    }
    if (!user) {
      return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Agent ni konfiguriran.' }, { status: 503 })
    }

    const { message, anonHistory } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Sporočilo je obvezno.' }, { status: 400 })
    }

    // Load profile: subscription tier + daily usage
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, ai_messages_used_today, ai_messages_reset_at')
      .eq('id', user.id)
      .maybeSingle()

    const tier = (profile?.subscription_tier ?? 'start') as string
    const dailyLimit = TIER_LIMITS[tier] ?? TIER_LIMITS.start

    // Reset counter if 24h have passed
    let usedToday: number = profile?.ai_messages_used_today ?? 0
    const resetAt = profile?.ai_messages_reset_at ? new Date(profile.ai_messages_reset_at) : new Date(0)
    if (Date.now() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
      usedToday = 0
      await supabaseAdmin
        .from('profiles')
        .update({ ai_messages_used_today: 0, ai_messages_reset_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    // Hard limit check
    if (usedToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Dnevni limit dosežen (${dailyLimit}). ${tier === 'start' ? 'Nadgradite na PRO za 100 sporočil/dan.' : 'Poskusite jutri.'}`,
          limit_reached: true,
          used: usedToday,
          limit: dailyLimit,
        },
        { status: 429 }
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
      await supabaseAdmin
        .from('profiles')
        .update({ ai_messages_used_today: usedToday + 1 })
        .eq('id', user.id)

      // Log cached usage
      await supabaseAdmin.from('ai_usage_logs').insert({
        user_id: user.id,
        model_used: 'cached',
        tokens_input: 0,
        tokens_output: 0,
        cost_usd: 0,
        response_cached: true,
        message_hash: cacheKey,
        user_message: message.slice(0, 500),
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

      return NextResponse.json({
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

    const systemPrompt = `Si LiftGO asistent za Slovenijo.
Pomagaš strankam najti prave mojstre za njihova dela ter obratno.
Odgovarjaš kratko in jasno v slovenščini.
Ko stranka opiše problem, vprašaj:
1. Kje se nahaja (mesto)?
2. Kako nujno je?
3. Ali ima okvirni proračun?

Pravilne povezave za uporabnike:
- Za oddajo povpraševanja: /#oddaj-povprasevanje (forma na domači strani)
- Za pregled mojstrov: /mojstri
- Za informacije kako deluje: /kako-deluje
- Za obrtnike ki želijo postati partnerji: /za-obrtnike

NIKOLI ne uporabi teh napačnih poti:
- /narocnik/... (napačno)
- /novo-povprasevanje/obrazec (napačno)`

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
    await supabaseAdmin
      .from('profiles')
      .update({ ai_messages_used_today: usedToday + 1 })
      .eq('id', user.id)

    // Increment lifetime totals (best-effort, non-blocking)
    supabaseAdmin
      .from('profiles')
      .select('ai_total_tokens_used, ai_total_cost_usd')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return
        return supabaseAdmin
          .from('profiles')
          .update({
            ai_total_tokens_used: (data.ai_total_tokens_used ?? 0) + inputTokens + outputTokens,
            ai_total_cost_usd: Number((data.ai_total_cost_usd ?? 0)) + costUsd,
          })
          .eq('id', user.id)
      })
      .catch(() => {})

    // Map full model ID to short name for DB CHECK constraint
    const modelShortName = modelSelection.modelId.includes('haiku') ? 'haiku-4' : 'sonnet-4'

    // Log usage
    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: user.id,
      model_used: modelShortName,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      cost_usd: costUsd,
      response_cached: false,
      message_hash: cacheKey,
      user_message: message.slice(0, 500),
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

    return NextResponse.json({
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
    return NextResponse.json({ error: msg }, { status })
  }
}

export const POST = withRateLimit(apiLimiter, postHandler)
