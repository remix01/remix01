import { supabaseAdmin } from '@/lib/supabase-admin'
import { anomalyDetector } from '@/lib/observability/alerting'
import { syncProfileCounter } from '@/lib/ai/quota-compat'

export interface AITelemetryEvent {
  userId: string
  agentType?: string
  endpoint?: string
  requestId?: string
  provider?: string
  modelUsed: string
  tokensInput: number
  tokensOutput: number
  costUsd: number
  responseTimeMs?: number
  cached?: boolean
  error?: string
  toolCallsCount?: number
  ragContextUsed?: boolean
  ragSourcesCount?: number
  userMessage?: string
  messagePreviewLimit?: number
}

const DEFAULT_PREVIEW_LIMIT = 500

/**
 * Safe telemetry emitter — never throws.
 *
 * Writes to `ai_usage_logs` and optionally increments
 * `profiles.ai_messages_used_today` for quota compatibility.
 *
 * Fields that may not exist in the DB schema are spread conditionally;
 * Supabase silently ignores unknown columns on insert.
 */
export async function emitAITelemetry(
  event: AITelemetryEvent,
  options?: { incrementProfileCounter?: boolean }
): Promise<void> {
  try {
    const previewLimit = event.messagePreviewLimit ?? DEFAULT_PREVIEW_LIMIT

    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: event.userId,
      model_used: event.modelUsed,
      tokens_input: event.tokensInput,
      tokens_output: event.tokensOutput,
      cost_usd: event.costUsd,
      response_cached: event.cached ?? false,
      ...(event.agentType ? { agent_type: event.agentType } : {}),
      ...(typeof event.responseTimeMs === 'number'
        ? { response_time_ms: event.responseTimeMs }
        : {}),
      ...(typeof event.userMessage === 'string'
        ? { user_message: event.userMessage.slice(0, previewLimit) }
        : {}),
      ...(typeof event.toolCallsCount === 'number'
        ? { tool_calls_count: event.toolCallsCount }
        : {}),
      ...(typeof event.ragContextUsed === 'boolean'
        ? { rag_context_used: event.ragContextUsed }
        : {}),
      ...(typeof event.ragSourcesCount === 'number'
        ? { rag_sources_count: event.ragSourcesCount }
        : {}),
      ...(event.requestId ? { request_id: event.requestId } : {}),
      ...(event.provider ? { provider: event.provider } : {}),
      ...(event.endpoint ? { endpoint: event.endpoint } : {}),
      ...(event.error ? { error: event.error.slice(0, 500) } : {}),
    })

    if (event.costUsd > 0) {
      anomalyDetector.checkDailyCostThreshold(event.costUsd)
    }
  } catch (err) {
    console.error(
      '[telemetry] Failed to write ai_usage_logs (non-fatal):',
      err instanceof Error ? err.message : err
    )
  }

  if (options?.incrementProfileCounter) {
    await syncProfileCounter(event.userId)
  }
}
