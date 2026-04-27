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

    const { povprasevanje_id, work_description } = await req.json()
    if (!work_description?.trim()) return fail('Opis dela je obvezen.', 400, 'VALIDATION_ERROR')

    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, subscription_tier')
      .eq('id', user.id).maybeSingle()
    if (!obrtnik) return fail('Profil obrtnika ni najden.', 404, 'NOT_FOUND')

    const tier = obrtnik.subscription_tier ?? 'start'
    if (!isAgentAccessible('materials_agent' as AIAgentType, tier)) {
      return fail('Materiali so samo za PRO obrtnike.', 403, 'FORBIDDEN', { upgrade_required: true, upgrade_url: '/cenik' })
    }

    const dailyLimit = getAgentDailyLimit('materials_agent' as AIAgentType, tier)
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('ai_messages_used_today, ai_messages_reset_at').eq('id', user.id).maybeSingle()
    const usedToday = profile?.ai_messages_used_today ?? 0
    const resetAt = profile?.ai_messages_reset_at ? new Date(profile.ai_messages_reset_at) : new Date(0)
    const effectiveUsed = Date.now() - resetAt.getTime() > 86_400_000 ? 0 : usedToday
    if (effectiveUsed >= dailyLimit) {
      return fail(`Dnevni limit dosežen (${dailyLimit}).`, 429, 'LIMIT_REACHED', { limit_reached: true })
    }

    const agentDef = await getAgentDefinition('materials_agent')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: agentDef.system_prompt,
      messages: [{ role: 'user', content: `Opis dela: "${work_description}"` }],
    })

    const raw = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd = estimateCost('claude-sonnet-4-6', inputTokens, outputTokens)

    let parsed: Record<string, any>
    try { parsed = JSON.parse(raw) }
    catch { const m = raw.match(/\{[\s\S]*\}/); parsed = m ? JSON.parse(m[0]) : { raw, material_list: [] } }

    const { data: matList } = await supabaseAdmin
      .from('agent_material_lists')
      .insert({
        obrtnik_id: obrtnik.id,
        povprasevanje_id: povprasevanje_id ?? null,
        material_list: parsed.material_list ?? [],
        total_min_eur: parsed.skupaj_ocena_eur?.min ?? null,
        total_max_eur: parsed.skupaj_ocena_eur?.max ?? null,
        suppliers: parsed.dobavitelji ?? [],
        predracun_text: parsed.predracun_tekst ?? null,
      })
      .select('id').single()

    await supabaseAdmin.from('profiles').update({ ai_messages_used_today: effectiveUsed + 1 }).eq('id', user.id)
    await (supabaseAdmin.rpc('upsert_agent_cost_summary' as any, {
      p_user_id: user.id, p_agent_type: 'materials_agent',
      p_tokens_in: inputTokens, p_tokens_out: outputTokens, p_cost_usd: costUsd,
    }) as any).catch(() => {})
    await (supabaseAdmin.from('ai_usage_logs').insert({
      user_id: user.id, model_used: 'sonnet-4', tokens_input: inputTokens,
      tokens_output: outputTokens, cost_usd: costUsd, response_cached: false,
      agent_type: 'materials_agent', user_message: work_description.slice(0,200),
    }) as any).catch(() => {})

    return success({
      material_list: parsed.material_list ?? [],
      total_min_eur: parsed.skupaj_ocena_eur?.min,
      total_max_eur: parsed.skupaj_ocena_eur?.max,
      suppliers: parsed.dobavitelji ?? [],
      predracun_text: parsed.predracun_tekst,
      list_id: matList?.id,
      usage: { used: effectiveUsed + 1, limit: dailyLimit },
    })
  } catch (error) {
    console.error('[agent/materials] POST:', error)
    return fail('Napaka pri generiranju seznama materiala.', 500, 'INTERNAL_ERROR')
  }
}
