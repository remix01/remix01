import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimateCost } from '@/lib/model-router'
import { getAgentDefinition } from '@/lib/agents/ai-definitions'
import type { AIAgentType } from '@/lib/agents/ai-router'
import { loadAiUsageProfile, normalizeDailyUsageWindow, evaluateAgentTierAccess, incrementDailyUsage } from '@/lib/agents/route-access-policy'
import { logAgentUsage } from '@/lib/agents/usage-logging'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const { povprasevanje_id, work_description } = await req.json()
    if (!work_description?.trim()) return NextResponse.json({ error: 'Opis dela je obvezen.' }, { status: 400 })

    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, subscription_tier')
      .eq('id', user.id).maybeSingle()
    if (!obrtnik) return NextResponse.json({ error: 'Profil obrtnika ni najden.' }, { status: 404 })

    const tier = obrtnik.subscription_tier ?? 'start'
    const access = evaluateAgentTierAccess('materials_agent' as AIAgentType, tier)
    if (!access.allowed) {
      return NextResponse.json({ error: 'Materiali so samo za PRO obrtnike.', upgrade_required: true, upgrade_url: '/cenik' }, { status: 403 })
    }

    const dailyLimit = access.dailyLimit
    const profile = await loadAiUsageProfile(user.id)
    const effectiveUsed = await normalizeDailyUsageWindow(user.id, profile)
    if (effectiveUsed >= dailyLimit) {
      return NextResponse.json({ error: `Dnevni limit dosežen (${dailyLimit}).`, limit_reached: true }, { status: 429 })
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

    await incrementDailyUsage(user.id, effectiveUsed + 1)
    await (supabaseAdmin.rpc('upsert_agent_cost_summary' as any, {
      p_user_id: user.id, p_agent_type: 'materials_agent',
      p_tokens_in: inputTokens, p_tokens_out: outputTokens, p_cost_usd: costUsd,
    }) as any).catch(() => {})
    await logAgentUsage({
      userId: user.id,
      modelUsed: 'sonnet-4',
      tokensInput: inputTokens,
      tokensOutput: outputTokens,
      costUsd,
      responseCached: false,
      agentType: 'materials_agent',
      userMessage: work_description,
      messagePreviewLimit: 200,
    }).catch(() => {})

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Napaka pri generiranju seznama materiala.' }, { status: 500 })
  }
}
