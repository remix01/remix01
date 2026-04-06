/**
 * Smart Agent Router Pattern
 *
 * Selects the best AI agent dynamically based on task type, task content,
 * and the user's subscription tier. Enforces quota before routing.
 *
 * Routing priority:
 * 1. Explicit agent override (if provided)
 * 2. Keyword / intent classification of the message
 * 3. User role heuristic (narocnik vs obrtnik)
 * 4. Fallback to general_chat
 */

import { createClient } from '@supabase/supabase-js'
import { executeAgent, type AgentExecutionResult, AgentAccessError, QuotaExceededError } from '@/lib/ai/orchestrator'
import {
  AGENT_DAILY_LIMITS,
  AGENT_META,
  isAgentAccessible,
  type AIAgentType,
} from '@/lib/agents/ai-router'

// =============================================================================
// Supabase Admin Client
// =============================================================================

// Uses environment variables — consistent with the rest of the codebase
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

// =============================================================================
// Types
// =============================================================================

export type UserRole = 'narocnik' | 'obrtnik'

export interface RouterInput {
  /** LiftGO user ID */
  userId: string
  /** User role determines which agents are candidates */
  userRole: UserRole
  /** The raw message from the user */
  message: string
  /** Optional explicit agent override — skips classification */
  agentOverride?: AIAgentType
  /** Task context passed through to executeAgent */
  taskId?: string
  conversationId?: string
  additionalContext?: string
  useRAG?: boolean
  useTools?: boolean
}

export interface RouterResult {
  /** The agent that was selected */
  selectedAgent: AIAgentType
  /** How the agent was selected */
  selectionReason: 'override' | 'keyword' | 'role_heuristic' | 'fallback'
  /** Execution result from the selected agent */
  executionResult: AgentExecutionResult
  /** Whether the quota was checked (always true when routing succeeds) */
  quotaChecked: boolean
  /** Current daily usage for the selected agent */
  dailyUsage: number
  /** Daily limit for the selected agent given the user's tier */
  dailyLimit: number
}

export interface RouterMetrics {
  agent: AIAgentType
  dailyUsage: number
  dailyLimit: number
  remainingCalls: number
  tier: string
}

// =============================================================================
// Intent Keywords
// =============================================================================

/**
 * Keyword map: maps agent types to arrays of Slovenian / English trigger phrases.
 * More specific phrases should appear first to avoid false matches.
 */
const INTENT_KEYWORDS: Record<AIAgentType, string[]> = {
  work_description: [
    'opis dela', 'opiši', 'povpraševanje', 'kako opisati', 'kaj napisati', 'help describe',
  ],
  offer_comparison: [
    'primerjaj ponudbe', 'katera ponudba', 'najboljša ponudba', 'compare offers',
    'ponudbe', 'kateri mojster',
  ],
  scheduling_assistant: [
    'termin', 'kdaj', 'razpored', 'urnik', 'schedule', 'datum', 'ura', 'čas',
  ],
  video_diagnosis: [
    'slika', 'fotografija', 'video', 'diagnoza', 'ocena slike', 'analyze image',
  ],
  quote_generator: [
    'generiraj ponudbo', 'sestavi ponudbo', 'cena dela', 'generate quote', 'ponudbeni list',
  ],
  materials_agent: [
    'material', 'zaloge', 'kje kupiti', 'seznam materiala', 'cene materiala', 'tools needed',
  ],
  job_summary: [
    'povzetek', 'poročilo', 'zaključek dela', 'summary', 'report', 'po delu',
  ],
  offer_writing: [
    'napiši ponudbo', 'profesionalna ponudba', 'write offer', 'ustvari ponudbo',
  ],
  profile_optimization: [
    'profil', 'optimize profile', 'izboljšaj profil', 'več posla', 'SEO profil',
  ],
  general_chat: [],
}

// =============================================================================
// Core Routing Function
// =============================================================================

/**
 * Routes a user message to the most appropriate AI agent, enforces quota,
 * and returns the execution result.
 *
 * @throws {AgentAccessError} when the selected agent requires a higher tier
 * @throws {QuotaExceededError} when the user has exhausted their daily quota
 *
 * @example
 * const result = await routeToAgent({
 *   userId: 'user-123',
 *   userRole: 'narocnik',
 *   message: 'Primerjaj ponudbe ki sem jih dobil',
 *   taskId: 'task-456',
 * })
 * console.log(result.selectedAgent)   // 'offer_comparison'
 * console.log(result.executionResult.response)
 */
export async function routeToAgent(input: RouterInput): Promise<RouterResult> {
  const { userId, userRole, message, agentOverride, taskId, conversationId, additionalContext, useRAG, useTools } = input

  // 1. Get user tier from Supabase
  const userTier = await getUserTier(userId)

  // 2. Select agent
  let selectedAgent: AIAgentType
  let selectionReason: RouterResult['selectionReason']

  if (agentOverride) {
    selectedAgent = agentOverride
    selectionReason = 'override'
  } else {
    const classified = classifyIntent(message, userRole)
    if (classified.agent !== 'general_chat') {
      selectedAgent = classified.agent
      selectionReason = classified.reason
    } else {
      selectedAgent = 'general_chat'
      selectionReason = 'fallback'
    }
  }

  // 3. Tier check
  if (!isAgentAccessible(selectedAgent, userTier)) {
    throw new AgentAccessError(
      `Agent "${selectedAgent}" zahteva naročnino PRO. Trenutni tier: ${userTier}`
    )
  }

  // 4. Quota check
  const dailyUsage = await getDailyUsage(userId, selectedAgent)
  const tierLimits = AGENT_DAILY_LIMITS[userTier] ?? AGENT_DAILY_LIMITS['start']
  const dailyLimit = (tierLimits as Record<string, number>)[selectedAgent] ?? 0

  if (dailyUsage >= dailyLimit) {
    throw new QuotaExceededError(
      `Dnevna kvota za "${selectedAgent}" dosežena (${dailyUsage}/${dailyLimit})`
    )
  }

  // 5. Execute
  const executionResult = await executeAgent({
    userId,
    agentType: selectedAgent,
    userMessage: message,
    taskId,
    conversationId,
    additionalContext,
    useRAG: useRAG ?? true,
    useTools: useTools ?? false,
  })

  return {
    selectedAgent,
    selectionReason,
    executionResult,
    quotaChecked: true,
    dailyUsage,
    dailyLimit,
  }
}

// =============================================================================
// Intent Classification
// =============================================================================

/**
 * Classifies the intent of a message and returns the best matching agent.
 * Respects user role (narocnik vs obrtnik) to narrow candidates.
 */
export function classifyIntent(
  message: string,
  userRole: UserRole
): { agent: AIAgentType; reason: RouterResult['selectionReason'] } {
  const lowerMsg = message.toLowerCase()

  // Candidate agents filtered by role
  const candidateAgents = (Object.keys(INTENT_KEYWORDS) as AIAgentType[]).filter((agent) => {
    const meta = AGENT_META[agent]
    return meta.roles.includes(userRole)
  })

  // Score each agent by keyword matches
  let bestAgent: AIAgentType = 'general_chat'
  let bestScore = 0

  for (const agent of candidateAgents) {
    if (agent === 'general_chat') continue
    const keywords = INTENT_KEYWORDS[agent]
    let score = 0

    for (const keyword of keywords) {
      if (lowerMsg.includes(keyword.toLowerCase())) {
        // Longer keyword = more specific = higher score
        score += keyword.length
      }
    }

    if (score > bestScore) {
      bestScore = score
      bestAgent = agent
    }
  }

  if (bestScore > 0) {
    return { agent: bestAgent, reason: 'keyword' }
  }

  // Role-based heuristic fallback
  const heuristic = getRoleHeuristic(userRole)
  if (heuristic) {
    return { agent: heuristic, reason: 'role_heuristic' }
  }

  return { agent: 'general_chat', reason: 'fallback' }
}

/**
 * Returns the default agent for a given role when no keywords match.
 */
function getRoleHeuristic(role: UserRole): AIAgentType | null {
  switch (role) {
    case 'narocnik':
      return 'work_description'
    case 'obrtnik':
      return 'quote_generator'
    default:
      return null
  }
}

// =============================================================================
// Quota Inspection (non-routing)
// =============================================================================

/**
 * Returns quota metrics for a specific user and agent — useful for UI badges.
 */
export async function getAgentQuotaMetrics(
  userId: string,
  agentType: AIAgentType
): Promise<RouterMetrics> {
  const tier = await getUserTier(userId)
  const tierLimits = AGENT_DAILY_LIMITS[tier] ?? AGENT_DAILY_LIMITS['start']
  const dailyLimit = (tierLimits as Record<string, number>)[agentType] ?? 0
  const dailyUsage = await getDailyUsage(userId, agentType)

  return {
    agent: agentType,
    dailyUsage,
    dailyLimit,
    remainingCalls: Math.max(0, dailyLimit - dailyUsage),
    tier,
  }
}

/**
 * Returns quota metrics for all agents accessible to a given user.
 */
export async function getAllAgentQuotaMetrics(
  userId: string,
  userRole: UserRole
): Promise<RouterMetrics[]> {
  const tier = await getUserTier(userId)

  const accessibleAgents = (Object.keys(AGENT_META) as AIAgentType[]).filter((agent) => {
    const meta = AGENT_META[agent]
    return meta.roles.includes(userRole) && isAgentAccessible(agent, tier)
  })

  return Promise.all(accessibleAgents.map((agent) => getAgentQuotaMetrics(userId, agent)))
}

// =============================================================================
// Private Helpers
// =============================================================================

async function getUserTier(userId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', userId)
    .single()

  return data?.subscription_tier ?? 'start'
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

  return count ?? 0
}
