import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimateCost } from '@/lib/model-router'
import { getAgentDefinition } from '@/lib/agents/ai-definitions'
import { isAgentAccessible, getAgentDailyLimit } from '@/lib/agents/ai-router'
import type { AIAgentType } from '@/lib/agents/ai-router'

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

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Nepooblaščen dostop.', 401, 'UNAUTHORIZED')

    const { povprasevanje_id, extra_notes } = await req.json()
    if (!povprasevanje_id) return fail('povprasevanje_id je obvezen.', 400, 'VALIDATION_ERROR')

    // Get obrtnik profile linked to this user
    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, description, hourly_rate, years_experience, subscription_tier, avg_rating')
      .eq('id', user.id)
      .maybeSingle()
    if (!obrtnik) return fail('Profil obrtnika ni najden.', 404, 'NOT_FOUND')

    const tier = obrtnik.subscription_tier ?? 'start'
    if (!isAgentAccessible('quote_generator' as AIAgentType, tier)) {
      return fail('Ni dostopa.', 403, 'FORBIDDEN', { upgrade_required: true })
    }

    const dailyLimit = getAgentDailyLimit('quote_generator' as AIAgentType, tier)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('ai_messages_used_today, ai_messages_reset_at')
      .eq('id', user.id).maybeSingle()
    const usedToday = profile?.ai_messages_used_today ?? 0
    const resetAt = profile?.ai_messages_reset_at ? new Date(profile.ai_messages_reset_at) : new Date(0)
    const effectiveUsed = Date.now() - resetAt.getTime() > 86_400_000 ? 0 : usedToday
    if (effectiveUsed >= dailyLimit) {
      return fail(`Dnevni limit dosežen (${dailyLimit}).`, 429, 'LIMIT_REACHED', { limit_reached: true })
    }

    // Load povpraševanje
    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, title, description, location_city, urgency, budget_min, budget_max, preferred_date_from, preferred_date_to')
      .eq('id', povprasevanje_id)
      .maybeSingle()
    if (!pov) return fail('Povpraševanje ni najdeno.', 404, 'NOT_FOUND')

    const agentDef = await getAgentDefinition('quote_generator')
    const context = {
      obrtnik: { business_name: obrtnik.business_name, hourly_rate: obrtnik.hourly_rate, years_experience: obrtnik.years_experience, avg_rating: obrtnik.avg_rating },
      povprasevanje: { title: pov.title, description: pov.description, location_city: pov.location_city, urgency: pov.urgency, budget_min: pov.budget_min, budget_max: pov.budget_max },
      extra_notes,
    }
    const systemPrompt = agentDef.system_prompt + `\n\n---\nKONTEKST:\n${JSON.stringify(context, null, 2)}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const startTime = Date.now()
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 900,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generiraj osnutek ponudbe za to povpraševanje.' }],
    })

    const draftText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd = estimateCost('claude-sonnet-4-6', inputTokens, outputTokens)

    // Save draft to agent_quote_drafts table
    // Columns: id, obrtnik_id, povprasevanje_id, draft_text, price_min, price_max, duration_text, cross_sell, context_used, status, created_at, updated_at
    const { data: draft } = await supabaseAdmin
      .from('agent_quote_drafts')
      .insert({
        obrtnik_id: obrtnik.id,
        povprasevanje_id,
        draft_text: draftText,
        context_used: context,
        status: 'draft',
      })
      .select('id')
      .single()

    await supabaseAdmin.from('profiles').update({ ai_messages_used_today: effectiveUsed + 1 }).eq('id', user.id)
    await (supabaseAdmin.rpc('upsert_agent_cost_summary' as any, {
      p_user_id: user.id, p_agent_type: 'quote_generator',
      p_tokens_in: inputTokens, p_tokens_out: outputTokens, p_cost_usd: costUsd,
    }) as any).catch(() => {})
    await (supabaseAdmin.from('ai_usage_logs').insert({
      user_id: user.id, model_used: 'sonnet-4', tokens_input: inputTokens,
      tokens_output: outputTokens, cost_usd: costUsd, response_cached: false,
      agent_type: 'quote_generator', user_message: `quote for: ${pov.title?.slice(0,100)}`,
      response_time_ms: Date.now() - startTime,
    }) as any).catch(() => {})

    return success({
      draft_text: draftText,
      draft_id: draft?.id,
      usage: { used: effectiveUsed + 1, limit: dailyLimit },
    })
  } catch (error) {
    console.error('[agent/quote-generator] POST:', error)
    return fail('Napaka pri generiranju ponudbe.', 500, 'INTERNAL_ERROR')
  }
}
