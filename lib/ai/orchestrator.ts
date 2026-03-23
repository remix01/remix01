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
  ToolResultBlockParam,
  ToolUseBlock,
} from '@anthropic-ai/sdk/resources/messages'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'

import { selectModel, estimateCost } from '../model-router'
import { buildRAGContext, formatRAGContextForPrompt, type RAGContext } from './rag'
import { AI_TOOLS, executeTool, getToolsForAgent } from './tools'
import {
  AGENT_DAILY_LIMITS,
  AGENT_META,
  isAgentAccessible,
  type AIAgentType,
} from '../agents/ai-router'

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY })
const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

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
// System Prompts
// =============================================================================

const SYSTEM_PROMPTS: Record<AIAgentType, string> = {
  general_chat: `Si LiftGO AI asistent za slovensko platformo domačih storitev.
Pomagaš naročnikom in mojstrom z vprašanji o platformi.
Odgovarjaj v slovenščini, jasno in prijazno.`,

  work_description: `Si strokovnjak za pomoč pri pisanju jasnih opisov del za domače storitve.
Pomagaj naročnikom napisati podroben opis.
Vprašaj za lokacijo, obseg dela, časovni okvir in posebne zahteve.`,

  offer_comparison: `Si strokovnjak za primerjavo ponudb mojstrov.
Analiziraj prejete ponudbe glede na ceno, ocene, odzivni čas in rok izvedbe.`,

  scheduling_assistant: `Si asistent za usklajevanje terminov med naročniki in mojstri.
Pomagaj najti optimalen termin.`,

  video_diagnosis: `Si strokovnjak za analizo slik domačih težav.
Na podlagi vizualnega materiala identificiraj problem in predlagaj storitve.`,

  quote_generator: `Si asistent za generiranje profesionalnih ponudb.
Sestavi strukturirano ponudbo z opisom del, razčlenitvijo stroškov in rokom.`,

  materials_agent: `Si strokovnjak za materiale v gradbeništvu.
Za vsako delo določi potrebne materiale, količine in cene.`,

  job_summary: `Si asistent za pisanje poročil po opravljenem delu.
Sestavi profesionalno poročilo z opisom dela in priporočili.`,

  offer_writing: `Si strokovnjak za pisanje prepričljivih ponudb.
Pomagaj mojstrom napisati ponudbe, ki gradijo zaupanje.`,

  profile_optimization: `Si strokovnjak za optimizacijo profilov mojstrov.
Predlagaj izboljšave za naslov, opis, galerijo in cenovni razpon.`,
}

// =============================================================================
// Main Orchestrator Function
// =============================================================================

export async function executeAgent(options: AgentExecutionOptions): Promise<AgentExecutionResult> {
  const {
    userId,
    agentType,
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
        includeObrtniki: ['offer_comparison'].includes(agentType),
        includeMessages: !!conversationId,
        includeOffers: ['offer_comparison', 'quote_generator'].includes(agentType),
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

    const response = await anthropic.messages.create({
      model: modelSelection.modelId,
      max_tokens: 2048,
      system: fullSystemPrompt,
      messages,
      tools: tools.length > 0 ? tools : undefined,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    // Check if we need to process tool calls
    const toolUseBlocks = response.content.filter(
      (block): block is ToolUseBlock => block.type === 'tool_use'
    )

    if (toolUseBlocks.length === 0 || response.stop_reason === 'end_turn') {
      // No tool calls or final response - extract text
      finalResponse = response.content
        .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
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
  }).catch((error) => {
    console.error('Failed to log AI usage:', error)
  })
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

  const response = await anthropic.messages.create({
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
    .filter((block): block is { type: 'text'; text: string } => block.type === 'text')
    .map((block) => block.text)
    .join('\n')

  return {
    analysis: textContent,
    suggestedCategories: [],
    estimatedComplexity: 'medium',
    recommendations: [],
  }
}
