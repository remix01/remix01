import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimateCost } from '@/lib/model-router'
import type { Job, AgentScheduleProposePayload } from '../queue'

const MODEL = 'claude-haiku-4-5-20251001'

export async function handleAgentSchedulePropose(job: Job<AgentScheduleProposePayload>): Promise<void> {
  const { job_id, user_id, obrtnik_id, preferences, povprasevanje_id } = job.data

  await supabaseAdmin
    .from('agent_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', job_id)

  try {
    const { data: availability } = await supabaseAdmin
      .from('obrtnik_availability')
      .select('day_of_week, time_from, time_to, is_available')
      .eq('obrtnik_id', obrtnik_id)
      .eq('is_available', true)

    const { data: obrtnik } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('business_name')
      .eq('id', obrtnik_id)
      .maybeSingle()

    const dayNames = ['Nedelja','Ponedeljek','Torek','Sreda','Četrtek','Petek','Sobota']
    const availabilityText = availability?.length
      ? availability.map(a => `${dayNames[a.day_of_week]}: ${a.time_from}–${a.time_to}`).join('\n')
      : 'Pon–Pet 8:00–17:00'

    const today = new Date()
    const nextDays: string[] = []
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() + i)
      const dow = d.getDay()
      if (!availability?.length || availability.some(a => a.day_of_week === dow && a.is_available)) {
        nextDays.push(d.toLocaleDateString('sl-SI', { weekday: 'long', day: 'numeric', month: 'long' }))
      }
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: `Si LiftGO urnik asistent. Mojster: ${obrtnik?.business_name ?? 'Mojster'}.\nRazpoložljivost:\n${availabilityText}\nMožni datumi:\n${nextDays.slice(0, 8).join('\n')}\nVrni SAMO JSON objekt brez markdown:`,
      messages: [{
        role: 'user',
        content: `Preference stranke: "${preferences.raw}"\nVrni: {"proposed_slots":[{"label":"string","date_iso":"YYYY-MM-DD","time_from":"HH:MM","time_to":"HH:MM"}],"message_for_craftsman":"string","summary":"string"}`,
      }],
    })

    const raw = response.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let result: Record<string, unknown>
    try { result = JSON.parse(raw) }
    catch { const m = raw.match(/\{[\s\S]*\}/); result = m ? JSON.parse(m[0]) : { raw } }

    const inputTokens = response.usage.input_tokens
    const outputTokens = response.usage.output_tokens
    const costUsd = estimateCost(MODEL, inputTokens, outputTokens)

    await supabaseAdmin.from('agent_jobs').update({
      status: 'completed', result_payload: result,
      tokens_input: inputTokens, tokens_output: outputTokens,
      cost_usd: costUsd, model_used: MODEL, completed_at: new Date().toISOString(),
    }).eq('id', job_id)

    await supabaseAdmin.rpc('upsert_agent_cost_summary' as any, {
      p_user_id: user_id, p_agent_type: 'scheduling_assistant',
      p_tokens_in: inputTokens, p_tokens_out: outputTokens, p_cost_usd: costUsd,
    }).then(() => {}).catch(() => {})

    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id, model_used: 'haiku-4', tokens_input: inputTokens,
      tokens_output: outputTokens, cost_usd: costUsd, response_cached: false,
      agent_type: 'scheduling_assistant', user_message: `[async] ${preferences.raw.slice(0,200)}`,
    }).then(() => {}).catch(() => {})

  } catch (error) {
    await supabaseAdmin.from('agent_jobs').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString(),
    }).eq('id', job_id)
    throw error
  }
}
