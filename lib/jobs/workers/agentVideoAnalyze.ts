import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { estimateCost } from '@/lib/model-router'
import type { Job, AgentVideoAnalyzePayload } from '../queue'

const MODEL = 'claude-opus-4-1-20250805'

export async function handleAgentVideoAnalyze(job: Job<AgentVideoAnalyzePayload>): Promise<void> {
  const { job_id, user_id, file_url, file_type, description } = job.data

  await supabaseAdmin
    .from('agent_jobs')
    .update({ status: 'processing', started_at: new Date().toISOString() })
    .eq('id', job_id)

  try {
    const mediaType = file_type === 'video_frame' ? 'image/jpeg' : 'image/jpeg'
    
    // Fetch the image/video frame from the URL
    const response = await fetch(file_url)
    if (!response.ok) {
      throw new Error(`Failed to fetch media from URL: ${response.statusText}`)
    }
    
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    
    const systemPrompt = `Si LiftGO video diagnostični asistent. Analiziraj poslane slike/video kadre in opravi detaljno diagnozo problema.
Vrni strukturiran JSON odgovor z naslednjimi polji:
- "issue_detected": string - glavna ugotovitev
- "severity": "low" | "medium" | "high" | "critical" - resničnost
- "likely_causes": string[] - mögočni vzroki
- "recommendations": string[] - priporočila za popravilo
- "urgency_suggestion": "normalno" | "kmalu" | "nujno"
- "estimated_cost_range": "number-number EUR" - ocena cene
- "explanation": string - razlaga za stranko`

    const userMessage = description
      ? `Uporabnikova pripiska: "${description}"\n\nAnaliziraj to sliko/video in podaj diagnozo problema.`
      : `Analiziraj to sliko/video in podaj diagnozo problema.`

    const apiResponse = await client.messages.create({
      model: MODEL,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64,
            },
          },
          {
            type: 'text',
            text: userMessage,
          },
        ],
      }],
    })

    const raw = apiResponse.content.filter(b => b.type === 'text').map(b => (b as any).text).join('')
    let result: Record<string, unknown>
    
    try {
      result = JSON.parse(raw)
    } catch {
      const m = raw.match(/\{[\s\S]*\}/)
      result = m ? JSON.parse(m[0]) : { raw, explanation: raw }
    }

    const inputTokens = apiResponse.usage.input_tokens
    const outputTokens = apiResponse.usage.output_tokens
    const costUsd = estimateCost(MODEL, inputTokens, outputTokens)

    await supabaseAdmin.from('agent_jobs').update({
      status: 'completed',
      result_payload: result,
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      cost_usd: costUsd,
      model_used: MODEL,
      completed_at: new Date().toISOString(),
    }).eq('id', job_id)

    await supabaseAdmin.rpc('upsert_agent_cost_summary' as any, {
      p_user_id: user_id,
      p_agent_type: 'video_diagnosis',
      p_tokens_in: inputTokens,
      p_tokens_out: outputTokens,
      p_cost_usd: costUsd,
    }).catch(() => {})

    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id,
      model_used: 'opus-4-1',
      tokens_input: inputTokens,
      tokens_output: outputTokens,
      cost_usd: costUsd,
      response_cached: false,
      agent_type: 'video_diagnosis',
      user_message: `[async video analysis] ${file_type}`,
    }).catch(() => {})

  } catch (error) {
    await supabaseAdmin.from('agent_jobs').update({
      status: 'failed',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      completed_at: new Date().toISOString(),
    }).eq('id', job_id)
    throw error
  }
}
