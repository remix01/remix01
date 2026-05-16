/**
 * Enhanced AI Orchestrator for LiftGO
 *
 * Integrates:
 * - RAG (Retrieval-Augmented Generation) for contextual responses
 * - Tool Stacking (function calling) for autonomous actions
 * - Multi-model routing for cost optimization
 * - Usage tracking and quota enforcement
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  ContentBlock,
  Message,
  MessageParam,
  TextBlock,
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@supabase/supabase-js'
import { env, isProduction, requireFeatureEnv } from '@/lib/env'

import { selectModel, estimateCost } from '../model-router'
import { buildRAGContext, formatRAGContextForPrompt, type RAGContext } from './rag'
import { AI_TOOLS, executeTool, getToolsForAgent } from './tools'
import {
  AGENT_DAILY_LIMITS,
  AGENT_META,
  isAgentAccessible,
  mapLegacyAgentType,
  type AIAgentType,
  type CoreRoleAgentType,
} from '../agents/ai-router'

// Lazy client — never crash at module load if API key is absent
let _anthropicClient: Anthropic | null = null
function getAnthropicClient(): Anthropic {
  if (!_anthropicClient) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error('[Orchestrator] ANTHROPIC_API_KEY not configured')
    }
    _anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
  }
  return _anthropicClient
}

if (isProduction()) requireFeatureEnv('supabase')

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  env.SUPABASE_SERVICE_ROLE_KEY || 'development-service-role-key'
)

// =============================================================================
// Types
// =============================================================================

export interface AgentExecutionOptions {
  userId: string
  agentType: AIAgentType
  userMessage: string
  taskId?: string
  conversationId?: string
  useRAG?: boolean
  useTools?: boolean
  systemPromptOverride?: string
  additionalContext?: string
  imageUrl?: string
  maxToolIterations?: number
}

export interface AgentExecutionResult {
  response: string
  agentType: AIAgentType
  modelId: string
  ragContext?: RAGContext
  toolCalls?: Array<{
    name: string
    input: Record<string, unknown>
    output: unknown
  }>
  usage: {
    inputTokens: number
    outputTokens: number
  }
  costUsd: number
  durationMs: number
}

// =============================================================================
// Helper: Type guard for TextBlock
// =============================================================================

function isTextBlock(block: ContentBlock): block is TextBlock {
  return block.type === 'text'
}

// =============================================================================
// System Prompts
// =============================================================================

const SYSTEM_PROMPTS: Record<CoreRoleAgentType, string> = {
  onboarding_assistant: `You are the LiftGO onboarding assistant.
You help users understand steps, requirements, and safe next actions.
Never make business-critical decisions, approvals, or commitments on behalf of users.
Never trigger activation logic, account upgrades, payment capture, or escrow transitions.`,

  provider_coach: `You are the LiftGO provider coach.
You suggest better offers, profile text, and communication improvements.
Your output is advisory only and must not include business-critical decisions.
Never trigger activation logic, account changes, or payment state transitions.`,

  payment_helper: `You are the LiftGO payment helper.
You explain payment timelines, statuses, and required human confirmations.
Do not make business-critical decisions and do not execute financial actions.
Never trigger activation logic, captures, releases, or refunds.`,

  support_agent: `You are the LiftGO support agent.
You troubleshoot and guide users with neutral recommendations and escalation paths.
Do not make business-critical decisions, legal decisions, or policy overrides.
Never trigger activation logic or irreversible platform actions.`,
}

// =============================================================================
// Main Orchestrator Function
// =============================================================================

export async function executeAgent(options: AgentExecutionOptions): Promise<AgentExecutionResult> {
  const {
    userId,
    agentType: rawAgentType,
    userMessage,
    taskId,
    conversationId,
    useRAG = true,
    useTools = true,
    systemPromptOverride,
    additionalContext,
    imageUrl,
    maxToolIterations = 5,
  } = options

  const startTime = Date.now()
  const agentType = mapLegacyAgentType(rawAgentType)

  // 1. Check access and quota
  const userTier = await getUserTier(userId)
  if (!isAgentAccessible(agentType, userTier)) {
    throw new AgentAccessError(
      `Agent "${agentType}" zahteva naročnino PRO. Trenutni tier: ${userTier}`
    )
  }

  const dailyUsage = await getDailyUsage(userId, agentType)
  const dailyLimit = AGENT_DAILY_LIMITS[userTier]?.[agentType] ?? 0
  if (dailyUsage >= dailyLimit) {
    throw new QuotaExceededError(
      `Dnevna kvota za "${agentType}" dosežena (${dailyUsage}/${dailyLimit})`
    )
  }

  // 2. Build RAG context if enabled
  let ragContext: RAGContext | undefined
  let ragPromptSection = ''

  if (useRAG) {
    try {
      ragContext = await buildRAGContext(userMessage, {
        includeTasks: true,
        includeObrtniki: ['support_agent'].includes(agentType),
        includeMessages: !!conversationId,
        includeOffers: ['provider_coach', 'support_agent'].includes(agentType),
        conversationId,
        taskId,
        maxPerSource: 5,
      })
      ragPromptSection = formatRAGContextForPrompt(ragContext)
    } catch (error) {
      console.warn('RAG context retrieval failed:', error)
    }
  }

  // 3. Select model based on complexity
  const modelSelection = selectModel(userMessage)

  // 4. Build system prompt
  const baseSystemPrompt = systemPromptOverride || SYSTEM_PROMPTS[agentType]
  const fullSystemPrompt = `${baseSystemPrompt}

Današnji datum: ${new Date().toLocaleDateString('sl-SI')}
${ragPromptSection}
${additionalContext ? `\nDodaten kontekst:\n${additionalContext}` : ''}`

  // 5. Build messages
  const messages: MessageParam[] = []

  if (imageUrl) {
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'url',
            url: imageUrl,
          },
        },
        {
          type: 'text',
          text: userMessage,
        },
      ],
    })
  } else {
    messages.push({
      role: 'user',
      content: userMessage,
    })
  }

  // 6. Get tools for this agent if enabled
  const tools = useTools ? getToolsForAgent(agentType) : []

  // 7. Execute with tool use loop
  let totalInputTokens = 0
  let totalOutputTokens = 0
  const toolCalls: AgentExecutionResult['toolCalls'] = []
  let iterations = 0
  let finalResponse = ''

  while (iterations < maxToolIterations) {
    iterations++

    // 10 s per-iteration timeout — AI must not block indefinitely
    const ITER_TIMEOUT_MS = 10_000
    let iterTimerId: ReturnType<typeof setTimeout> | undefined
    const response = await Promise.race([
      getAnthropicClient().messages.create({
        model: modelSelection.modelId,
        max_tokens: 2048,
        system: fullSystemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined,
      }),
      new Promise<never>((_, reject) => {
        iterTimerId = setTimeout(
          () => reject(new Error(`[Orchestrator] AI response timeout after ${ITER_TIMEOUT_MS}ms`)),
          ITER_TIMEOUT_MS
        )
      }),
    ]).finally(() => clearTimeout(iterTimerId))

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    // Check if we need to process tool calls
    const toolUseBlocks = response.content.filter(
      (block): block is ToolUseBlock => block.type === 'tool_use'
    )

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      // No tool calls or final response - extract text
      finalResponse = response.content
        .filter(isTextBlock)
        .map((block) => block.text)
        .join('\n')
      break
    }

    // Process tool calls
    const toolResults: ToolResultBlockParam[] = []

    for (const toolUse of toolUseBlocks) {
      const result = await executeTool(toolUse.name, toolUse.input as Record<string, unknown>)
      result.tool_use_id = toolUse.id

      toolCalls.push({
        name: toolUse.name,
        input: toolUse.input as Record<string, unknown>,
        output: JSON.parse(result.content as string),
      })

      toolResults.push(result)
    }

    // Add assistant message and tool results to conversation
    messages.push({
      role: 'assistant',
      content: response.content,
    })

    messages.push({
      role: 'user',
      content: toolResults,
    })
  }

  // 8. Calculate cost
  const costUsd = estimateCost(modelSelection.modelId, totalInputTokens, totalOutputTokens)

  // 9. Log usage
  const ragSourcesCount =
    (ragContext?.tasks?.length || 0) +
    (ragContext?.obrtniki?.length || 0) +
    (ragContext?.messages?.length || 0) +
    (ragContext?.offers?.length || 0)

  await logAgentUsage({
    userId,
    agentType,
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    costUsd,
    modelId: modelSelection.modelId,
    toolCallsCount: toolCalls.length,
    ragContextUsed: !!ragContext && ragSourcesCount > 0,
    ragSourcesCount,
  })

  // 10. Return result
  return {
    response: finalResponse,
    agentType,
    modelId: modelSelection.modelId,
    ragContext,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    usage: {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
    },
    costUsd,
    durationMs: Date.now() - startTime,
  }
}

// =============================================================================
// Safe Wrapper — never throws, logs failures, returns null on any error
// =============================================================================

export async function executeAgentSafe(
  options: AgentExecutionOptions,
  timeoutMs = 15_000
): Promise<AgentExecutionResult | null> {
  let timerId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      executeAgent(options),
      new Promise<never>((_, reject) => {
        timerId = setTimeout(
          () => reject(new Error(`[executeAgentSafe] Timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      }),
    ]).finally(() => clearTimeout(timerId))
  } catch (err) {
    console.error('[executeAgentSafe] AI call failed — returning null. Reason:', err instanceof Error ? err.message : err)
    return null
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

async function getUserTier(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  return data?.subscription_tier || 'start'
}

async function getDailyUsage(userId: string, agentType: AIAgentType): Promise<number> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { count } = await supabaseAdmin
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('agent_type', agentType)
    .gte('created_at', today.toISOString())

  return count || 0
}

async function logAgentUsage(params: {
  userId: string
  agentType: AIAgentType
  inputTokens: number
  outputTokens: number
  costUsd: number
  modelId: string
  toolCallsCount: number
  ragContextUsed?: boolean
  ragSourcesCount?: number
}): Promise<void> {
  try {
    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: params.userId,
      agent_type: params.agentType,
      tokens_input: params.inputTokens,
      tokens_output: params.outputTokens,
      cost_usd: params.costUsd,
      model_used: params.modelId,
      tool_calls_count: params.toolCallsCount,
      rag_context_used: params.ragContextUsed ?? false,
      rag_sources_count: params.ragSourcesCount ?? 0,
      created_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Failed to log AI usage:', error)
  }
}

// =============================================================================
// Error Classes
// =============================================================================

export class AgentAccessError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AgentAccessError'
  }
}

export class QuotaExceededError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QuotaExceededError'
  }
}

// =============================================================================
// Multimodal Analysis Function
// =============================================================================

export async function analyzeImage(
  imageUrl: string,
  analysisType: 'diagnosis' | 'estimate' | 'general' = 'diagnosis'
): Promise<{
  analysis: string
  suggestedCategories: string[]
  estimatedComplexity: 'low' | 'medium' | 'high'
  recommendations: string[]
}> {
  const systemPrompts: Record<string, string> = {
    diagnosis: `Analiziraj sliko domače težave.
Identificiraj vrsto problema, oceno obsega in predlagane rešitve.
Odgovori v slovenščini.`,

    estimate: `Analiziraj sliko za oceno stroškov.
Oceni količino dela, potrebne materiale in zahtevnost.
Odgovori v slovenščini.`,

    general: `Opiši kaj vidiš na sliki v kontekstu domačih storitev.
Navedi probleme in potrebne storitve.
Odgovori v slovenščini.`,
  }

  const response = await getAnthropicClient().messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: systemPrompts[analysisType],
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'url',
              url: imageUrl,
            },
          },
          {
            type: 'text',
            text: 'Analiziraj to sliko.',
          },
        ],
      },
    ],
  })

  const textContent = response.content
    .filter(isTextBlock)
    .map((block) => block.text)
    .join('\n')

  return {
    analysis: textContent,
    suggestedCategories: [],
    estimatedComplexity: 'medium',
    recommendations: [],
  }
}
