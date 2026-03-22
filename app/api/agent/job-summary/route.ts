import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimateCost } from '@/lib/model-router'
import { getAgentDefinition } from '@/lib/agents/ai-definitions'
import { getAgentDailyLimit } from '@/lib/agents/ai-router'
import type { AIAgentType } from '@/lib/agents/ai-router'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const { povprasevanje_id, ponudba_id, work_notes, materials_used } = await req.json()
    if (!povprasevanje_id) return NextResponse.json({ error: 'povprasevanje_id je obvezen.' }, { status: 400 })

    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, business_name, subscription_tier')
      .eq('id', user.id).maybeSingle()
    if (!obrtnik) return NextResponse.json({ error: 'Profil obrtnika ni najden.' }, { status: 404 })

    const tier = obrtnik.subscription_tier ?? 'start'
    const dailyLimit = getAgentDailyLimit('job_summary' as AIAgentType, tier)
    const { data: profile } = await supabaseAdmin
      .from('profiles').select('ai_messages_used_today, ai_messages_reset_at').eq('id', user.id).maybeSingle()
    const usedToday = profile?.ai_messages_used_today ?? 0
    const resetAt = profile?.ai_messages_reset_at ? new Date(profile.ai_messages_reset_at) : new Date(0)
    const effectiveUsed = Date.now() - resetAt.getTime() > 86_400_000 ? 0 : usedToday
    if (effectiveUsed >= dailyLimit) {
      return NextResponse.json({ error: `Dnevni limit dosežen (${dailyLimit}).`, limit_reached: true }, { status: 429 })
    }

    const { data: pov } = await supabaseAdmin
      .from('povprasevanja')
      .select('id, title, description, location_city')
      .eq('id', povprasevanje_id).maybeSingle()

    let ponudba = null
    if (ponudba_id) {
      const { data: p } = await supabaseAdmin
        .from('ponudbe')
        .select('id, price_estimate, price_type, estimated_duration, accepted_at')
        .eq('id', ponudba_id).maybeSingle()
      ponudba = p
    }

    const agentDef = await getAgentDefinition('job_summary')
    const context = {
      obrtnik: { business_name: obrtnik.business_name },
      povprasevanje: pov,
      ponudba,
      work_notes,
      materials_used,
      date: new Date().toLocaleDateString('sl-SI'),
    }
    const systemPrompt = agentDef.system_prompt + `\n\n---\nKONTEKST:\n${JSON.stringify(context, null, 2)}`

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 700,
      system: systemPrompt,
      messages: [{ role: 'user', content: 'Generiraj zaključno poročilo za to delo.' }],
    })

    const reportText = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd = estimateCost('claude-haiku-4-5-20251001', inputTokens, outputTokens)

    const { data: report } = await supabaseAdmin
      .from('agent_job_reports')
      .insert({
        obrtnik_id: obrtnik.id,
        povprasevanje_id,
        ponudba_id: ponudba_id ?? null,
        report_text: reportText,
        report_data: context,
        sent_to_customer: false,
      })
      .select('id').single()

    await supabaseAdmin.from('profiles').update({ ai_messages_used_today: effectiveUsed + 1 }).eq('id', user.id)
    await Promise.resolve(supabaseAdmin.rpc('upsert_agent_cost_summary' as any, {
      p_user_id: user.id, p_agent_type: 'job_summary',
      p_tokens_in: inputTokens, p_tokens_out: outputTokens, p_cost_usd: costUsd,
    })).catch(() => {})
    await Promise.resolve(supabaseAdmin.from('ai_usage_logs').insert({
      user_id: user.id, model_used: 'haiku-4', tokens_input: inputTokens,
      tokens_output: outputTokens, cost_usd: costUsd, response_cached: false,
      agent_type: 'job_summary', user_message: `report for: ${pov?.title?.slice(0,100)}`,
    })).catch(() => {})

    return NextResponse.json({
      report_text: reportText,
      report_id: report?.id,
      usage: { used: effectiveUsed + 1, limit: dailyLimit },
    })
  } catch (error) {
    console.error('[agent/job-summary] POST:', error)
    return NextResponse.json({ error: 'Napaka pri generiranju poročila.' }, { status: 500 })
  }
}
