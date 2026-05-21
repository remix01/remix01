import { emitAITelemetry } from '@/lib/ai/telemetry'

export type LogAgentUsageParams = {
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
  requestId?: string
  endpoint?: string
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
    userMessage: params.userMessage,
    responseTimeMs: params.responseTimeMs,
    messagePreviewLimit: params.messagePreviewLimit,
  })
}

/**
 * Fire-and-forget wrapper — logging failure never breaks the user response.
 */
export function safeLogAgentUsage(params: LogAgentUsageParams): void {
  logAgentUsage(params).catch((err) => {
    console.error(
      `[safeLogAgentUsage] failed for ${params.endpoint ?? params.agentType ?? 'unknown'}:`,
      err instanceof Error ? err.message : err
    )
  })
}
