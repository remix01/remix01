/**
 * AI Chat Endpoint with RAG and Tool Calling
 *
 * POST /api/ai/chat
 *
 * Enhanced AI chat that:
 * - Retrieves relevant context via RAG
 * - Uses function calling for autonomous actions
 * - Routes to appropriate model based on complexity
 * - Tracks usage and enforces quotas
 */

import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { executeAgent, AgentAccessError, QuotaExceededError } from '@/lib/ai/orchestrator'
import type { AIAgentType } from '@/lib/agents/ai-router'
import { ok, fail } from '@/lib/http/response'

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  env.SUPABASE_SERVICE_ROLE_KEY || 'development-service-role-key'
)

interface ChatRequest {
  message: string
  agentType?: AIAgentType
  taskId?: string
  conversationId?: string
  useRAG?: boolean
  useTools?: boolean
  additionalContext?: string
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return fail('Unauthorized', 401)
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return fail('Invalid token', 401)
    }

    // 2. Parse request
    const body: ChatRequest = await request.json()

    if (!body.message?.trim()) {
      return fail('Message is required', 400)
    }

    // 3. Execute agent
    const result = await executeAgent({
      userId: user.id,
      agentType: body.agentType || 'general_chat',
      userMessage: body.message,
      taskId: body.taskId,
      conversationId: body.conversationId,
      useRAG: body.useRAG ?? true,
      useTools: body.useTools ?? true,
      additionalContext: body.additionalContext,
    })

    // 4. Return response
    return ok({
      success: true,
      response: result.response,
      metadata: {
        agentType: result.agentType,
        modelId: result.modelId,
        usage: result.usage,
        costUsd: result.costUsd,
        durationMs: result.durationMs,
        ragContextUsed: !!result.ragContext,
        toolCallsCount: result.toolCalls?.length || 0,
      },
      toolCalls: result.toolCalls,
    })
  } catch (error) {
    console.error('AI Chat error:', error)

    if (error instanceof AgentAccessError) {
      return fail('Access denied', 403, { message: error.message, code: 'AGENT_ACCESS_DENIED' })
    }

    if (error instanceof QuotaExceededError) {
      return fail('Quota exceeded', 429, { message: error.message, code: 'QUOTA_EXCEEDED' })
    }

    return fail('Internal server error', 500, { message: error instanceof Error ? error.message : 'Unknown error' })
  }
}

// Health check
export async function GET() {
  return ok({
    status: 'ok',
    service: 'ai-chat',
    features: ['rag', 'tool-calling', 'model-routing'],
  })
}
