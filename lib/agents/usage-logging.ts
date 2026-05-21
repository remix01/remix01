import { emitAITelemetry } from '@/lib/ai/telemetry'

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

export async function logAgentUsage(params: LogAgentUsageParams): Promise<void> {
  await emitAITelemetry({
    userId: params.userId,
    modelUsed: params.modelUsed,
    tokensInput: params.tokensInput,
    tokensOutput: params.tokensOutput,
    costUsd: params.costUsd,
    cached: params.responseCached,
    agentType: params.agentType,
    messageHash: params.messageHash,
    userMessage: params.userMessage,
    responseTimeMs: params.responseTimeMs,
    messagePreviewLimit: params.messagePreviewLimit,
  })
}
