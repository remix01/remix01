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

import { NextRequest, NextResponse } from 'next/server'
import { executeAgent, AgentAccessError, QuotaExceededError } from '@/lib/ai/orchestrator'
import type { AIAgentType } from '@/lib/agents/ai-router'
import { validateAIRequest } from '@/lib/ai/ai-security-middleware'

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
    const security = await validateAIRequest(request)
    if ('error' in security) return security.error
    const { context: secCtx } = security

    const body: ChatRequest = await request.json()

    if (!body.message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const result = await executeAgent({
      userId: secCtx.userId,
      agentType: body.agentType || 'support_agent',
      userMessage: body.message,
      taskId: body.taskId,
      conversationId: body.conversationId,
      useRAG: body.useRAG ?? true,
      useTools: body.useTools ?? true,
      additionalContext: body.additionalContext,
    })

    // 4. Return response
    return NextResponse.json({
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
      return NextResponse.json(
        {
          error: 'Access denied',
          message: error.message,
          code: 'AGENT_ACCESS_DENIED',
        },
        { status: 403 }
      )
    }

    if (error instanceof QuotaExceededError) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: error.message,
          code: 'QUOTA_EXCEEDED',
        },
        { status: 429 }
      )
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'ai-chat',
    features: ['rag', 'tool-calling', 'model-routing'],
  })
}
