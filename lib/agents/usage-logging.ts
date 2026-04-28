import { supabaseAdmin } from '@/lib/supabase-admin'

type LogAgentUsageParams = {
  userId: string
  modelUsed: string
  tokensInput: number
  tokensOutput: number
  costUsd: number
  responseCached: boolean
  agentType?: string
  messageHash?: string | null
  userMessage?: string
  responseTimeMs?: number
  messagePreviewLimit?: number
}

const DEFAULT_PREVIEW_LIMIT = 500

export async function logAgentUsage(params: LogAgentUsageParams): Promise<void> {
  const {
    userId,
    modelUsed,
    tokensInput,
    tokensOutput,
    costUsd,
    responseCached,
    agentType,
    messageHash,
    userMessage,
    responseTimeMs,
    messagePreviewLimit = DEFAULT_PREVIEW_LIMIT,
  } = params

  await supabaseAdmin.from('ai_usage_logs').insert({
    user_id: userId,
    model_used: modelUsed,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost_usd: costUsd,
    response_cached: responseCached,
    ...(messageHash ? { message_hash: messageHash } : {}),
    ...(typeof userMessage === 'string' ? { user_message: userMessage.slice(0, messagePreviewLimit) } : {}),
    ...(typeof responseTimeMs === 'number' ? { response_time_ms: responseTimeMs } : {}),
    ...(agentType ? { agent_type: agentType } : {}),
  })
}
