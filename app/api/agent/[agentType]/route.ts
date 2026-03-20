import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildCacheKey, getCachedResponse, setCachedResponse } from '@/lib/ai-cache'
import { selectModel, estimateCost } from '@/lib/model-router'
import { getAgentDefinition } from '@/lib/agents/ai-definitions'
import { isAgentAccessible, getAgentDailyLimit } from '@/lib/agents/ai-router'
import type { AIAgentType } from '@/lib/agents/ai-router'

const MAX_TOKENS = 800

type StoredMessage = {
  role: 'user' | 'agent'
  content: string
  timestamp: number
}

type Params = { params: Promise<{ agentType: string }> }

// POST — send message to agent
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { agentType } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Agent ni konfiguriran.' }, { status: 503 })
    }

    const { message, context } = await req.json()
    if (!message?.trim()) {
      return NextResponse.json({ error: 'Sporočilo je obvezno.' }, { status: 400 })
    }

    // Load user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, ai_messages_used_today, ai_messages_reset_at')
      .eq('id', user.id)
      .maybeSingle()

    const tier = (profile?.subscription_tier ?? 'start') as string

    // Tier access check
    if (!isAgentAccessible(agentType as AIAgentType, tier)) {
      return NextResponse.json(
        {
          error: 'Ta agent je na voljo samo za PRO naročnike.',
          upgrade_required: true,
          upgrade_url: '/obrtnik/narocnina',
        },
        { status: 403 }
      )
    }

    // Daily limit check
    const dailyLimit = getAgentDailyLimit(agentType as AIAgentType, tier)
    if (dailyLimit === 0) {
      return NextResponse.json(
        { error: 'Ta agent ni dostopen z vašim paketom.', upgrade_required: true },
        { status: 403 }
      )
    }

    // Reset counter if 24h passed
    let usedToday = profile?.ai_messages_used_today ?? 0
    const resetAt = profile?.ai_messages_reset_at ? new Date(profile.ai_messages_reset_at) : new Date(0)
    if (Date.now() - resetAt.getTime() > 24 * 60 * 60 * 1000) {
      usedToday = 0
      await supabaseAdmin
        .from('profiles')
        .update({ ai_messages_used_today: 0, ai_messages_reset_at: new Date().toISOString() })
        .eq('id', user.id)
    }

    if (usedToday >= dailyLimit) {
      return NextResponse.json(
        {
          error: `Dnevni limit dosežen (${dailyLimit} sporočil). Poskusite jutri.`,
          limit_reached: true,
          used: usedToday,
          limit: dailyLimit,
        },
        { status: 429 }
      )
    }

    // Load agent definition + system prompt
    const agentDef = await getAgentDefinition(agentType)

    // Inject context into system prompt if provided
    let systemPrompt = agentDef.system_prompt
    if (context && Object.keys(context).length > 0) {
      systemPrompt += `\n\n---\nKONTEKST:\n${JSON.stringify(context, null, 2)}`
    }

    // Load conversation history for this agent
    const { data: conv } = await supabaseAdmin
      .from('ai_agent_conversations')
      .select('id, messages')
      .eq('user_id', user.id)
      .eq('agent_type', agentType)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    const history: StoredMessage[] = Array.isArray(conv?.messages) ? conv.messages : []

    // Keep last 20 messages for context window efficiency
    const claudeMessages = history.slice(-20).map(m => ({
      role: (m.role === 'agent' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.content,
    }))

    // Cache only for simple haiku agents (not offer_writing/comparison which use context)
    const useCache = agentDef.model_preference === 'haiku' || agentDef.model_preference === 'auto'
    const noContextProvided = !context || Object.keys(context).length === 0
    const cacheKey = useCache && noContextProvided ? buildCacheKey(`${agentType}:${message}`) : null

    if (cacheKey) {
      const cached = await getCachedResponse(cacheKey)
      if (cached) {
        await persistConversation(user.id, agentType, conv, history, message, cached)
        await logUsage(user.id, usedToday, agentType, 'cached', 0, 0, 0, 0, cacheKey, message)
        return NextResponse.json({
          message: cached,
          cached: true,
          agent: agentType,
          usage: { used: usedToday + 1, limit: dailyLimit === Infinity ? null : dailyLimit },
        })
      }
    }

    // Select model based on agent preference
    const modelPref = agentDef.model_preference
    const modelSelection =
      modelPref === 'sonnet'
        ? { modelId: 'claude-sonnet-4-6', reason: 'agent config', complexityScore: 5 }
        : modelPref === 'haiku'
          ? { modelId: 'claude-haiku-4-5-20251001', reason: 'agent config', complexityScore: 1 }
          : selectModel(message)

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const startTime = Date.now()

    const response = await client.messages.create({
      model: modelSelection.modelId,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages: [...claudeMessages, { role: 'user', content: message }],
    })

    const responseMs = Date.now() - startTime
    const assistantText = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd = estimateCost(modelSelection.modelId, inputTokens, outputTokens)
    const modelShortName = modelSelection.modelId.includes('haiku') ? 'haiku-4' : 'sonnet-4'

    if (cacheKey) await setCachedResponse(cacheKey, assistantText)
    await persistConversation(user.id, agentType, conv, history, message, assistantText)
    await logUsage(user.id, usedToday, agentType, modelShortName, inputTokens, outputTokens, costUsd, responseMs, cacheKey, message)

    console.log(`[agent/${agentType}] model=${modelSelection.modelId} tokens=${inputTokens}+${outputTokens} cost=$${costUsd.toFixed(6)}`)

    return NextResponse.json({
      message: assistantText,
      cached: false,
      agent: agentType,
      model: modelSelection.modelId,
      usage: { used: usedToday + 1, limit: dailyLimit === Infinity ? null : dailyLimit },
    })
  } catch (error) {
    console.error('[agent/dynamic] error:', error)
    const status = error instanceof Anthropic.APIError ? error.status : 500
    return NextResponse.json({ error: 'Napaka pri procesiranju. Poskusite znova.' }, { status })
  }
}

// GET — load conversation history
export async function GET(req: NextRequest, { params }: Params) {
  try {
    const { agentType } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const { data } = await supabaseAdmin
      .from('ai_agent_conversations')
      .select('messages')
      .eq('user_id', user.id)
      .eq('agent_type', agentType)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ messages: data?.messages ?? [] })
  } catch {
    return NextResponse.json({ messages: [] })
  }
}

// DELETE — archive conversation
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { agentType } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    await supabaseAdmin
      .from('ai_agent_conversations')
      .update({ status: 'archived' })
      .eq('user_id', user.id)
      .eq('agent_type', agentType)
      .eq('status', 'active')

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Napaka pri brisanju.' }, { status: 500 })
  }
}

// ── helpers ────────────────────────────────────────────────────────────────

async function persistConversation(
  userId: string,
  agentType: string,
  existingConv: { id: string; messages: StoredMessage[] } | null,
  history: StoredMessage[],
  userMessage: string,
  assistantText: string,
) {
  const updatedHistory: StoredMessage[] = [
    ...history,
    { role: 'user', content: userMessage, timestamp: Date.now() },
    { role: 'agent', content: assistantText, timestamp: Date.now() },
  ]

  if (existingConv?.id) {
    await supabaseAdmin
      .from('ai_agent_conversations')
      .update({ messages: updatedHistory, updated_at: new Date().toISOString() })
      .eq('id', existingConv.id)
  } else {
    await supabaseAdmin.from('ai_agent_conversations').insert({
      user_id: userId,
      agent_type: agentType,
      messages: updatedHistory,
      status: 'active',
    })
  }
}

async function logUsage(
  userId: string,
  usedToday: number,
  agentType: string,
  modelShortName: string,
  inputTokens: number,
  outputTokens: number,
  costUsd: number,
  responseMs: number,
  cacheKey: string | null,
  message: string,
) {
  await supabaseAdmin
    .from('profiles')
    .update({ ai_messages_used_today: usedToday + 1 })
    .eq('id', userId)

  await supabaseAdmin.from('ai_usage_logs').insert({
    user_id: userId,
    model_used: modelShortName,
    tokens_input: inputTokens,
    tokens_output: outputTokens,
    cost_usd: costUsd,
    response_cached: modelShortName === 'cached',
    message_hash: cacheKey,
    user_message: message.slice(0, 500),
    response_time_ms: responseMs,
    agent_type: agentType,
  })
}
