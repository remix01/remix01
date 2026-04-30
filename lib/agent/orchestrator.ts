/**
 * Deprecated legacy orchestrator adapter.
 *
 * Duplicate orchestration logic has been removed.
 * This module now delegates to the single orchestrator in `lib/ai/orchestrator`.
 */

import { executeAgent } from '@/lib/ai/orchestrator'
import { mapLegacyAgentType } from '@/lib/agents/ai-router'
import type { AgentContext } from './context'

export interface ToolCall {
  tool: string
  params: Record<string, unknown>
}

export interface OrchestratorResponse {
  success: boolean
  toolCall?: ToolCall
  message?: string
  error?: string
}

export async function orchestrate(
  userMessage: string,
  context: AgentContext
): Promise<OrchestratorResponse> {
  try {
    const roleAgent = mapLegacyAgentType('general_chat')

    const result = await executeAgent({
      userId: context.userId,
      agentType: roleAgent,
      userMessage,
      conversationId: context.sessionId,
      useRAG: true,
      useTools: false,
      additionalContext:
        'Legacy adapter mode: advisory response only. No business-critical decisions. No activation logic.',
    })

    return {
      success: true,
      toolCall: {
        tool: 'chat',
        params: {
          message: result.response,
        },
      },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
