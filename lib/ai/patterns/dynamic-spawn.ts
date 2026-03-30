/**
 * Dynamic Agent Spawning Pattern
 *
 * Allows an orchestrator agent to spawn sub-agents dynamically based on the
 * complexity and requirements detected in the input. Sub-agents run in parallel
 * (pool) or sequentially, and their results are merged back into a unified
 * response.
 *
 * This pattern is particularly useful in LiftGO when a single task request
 * involves multiple trade categories (e.g., plumbing + electrical + tiling)
 * that each require specialist agents.
 */

import { executeAgent, type AgentExecutionResult } from '@/lib/ai/orchestrator'
import type { AIAgentType } from '@/lib/agents/ai-router'
import Anthropic from '@anthropic-ai/sdk'

// =============================================================================
// Anthropic Client
// =============================================================================

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

// =============================================================================
// Types
// =============================================================================

export interface SpawnConfig {
  /** The agent type to spawn */
  agentType: AIAgentType
  /** The message / task for the spawned agent */
  message: string
  /** Optional additional context */
  additionalContext?: string
  /** Whether to use RAG for this spawned agent */
  useRAG?: boolean
}

export interface SpawnResult {
  agentType: AIAgentType
  message: string
  result: AgentExecutionResult
  error?: string
  success: boolean
}

export interface SpawnPoolResult {
  results: SpawnResult[]
  succeeded: SpawnResult[]
  failed: SpawnResult[]
  mergedResponse: string
  totalCostUsd: number
  totalInputTokens: number
  totalOutputTokens: number
  durationMs: number
}

export interface ComplexityAnalysis {
  /** Detected sub-tasks or domains */
  domains: string[]
  /** Recommended agents for each domain */
  recommendedAgents: AIAgentType[]
  /** Estimated complexity level */
  complexity: 'simple' | 'moderate' | 'complex'
  /** The analysis text from Claude */
  reasoning: string
}

// =============================================================================
// Single Agent Spawn
// =============================================================================

/**
 * Spawns a single sub-agent with the given configuration.
 * This is the atomic building block of the dynamic spawn pattern.
 *
 * @example
 * const result = await spawnAgent(userId, {
 *   agentType: 'materials_agent',
 *   message: 'Seznam materiala za menjavo pip v kopalnici 10m²',
 * })
 */
export async function spawnAgent(
  userId: string,
  config: SpawnConfig
): Promise<SpawnResult> {
  try {
    const result = await executeAgent({
      userId,
      agentType: config.agentType,
      userMessage: config.message,
      additionalContext: config.additionalContext,
      useRAG: config.useRAG ?? false,
      useTools: false,
    })

    return {
      agentType: config.agentType,
      message: config.message,
      result,
      success: true,
    }
  } catch (error) {
    return {
      agentType: config.agentType,
      message: config.message,
      result: {} as AgentExecutionResult,
      error: error instanceof Error ? error.message : String(error),
      success: false,
    }
  }
}

// =============================================================================
// Agent Pool — Spawn Multiple in Parallel
// =============================================================================

/**
 * Spawns a pool of agents in parallel and merges their results.
 * Uses Promise.allSettled so a single agent failure doesn't abort others.
 *
 * After all agents complete, a final Claude call merges the outputs into
 * a single coherent response.
 *
 * @example
 * const pool = await spawnAgentPool(userId, [
 *   { agentType: 'quote_generator', message: 'Cena za elektriko' },
 *   { agentType: 'materials_agent', message: 'Material za elektriko' },
 *   { agentType: 'job_summary', message: 'Povzetek el. dela' },
 * ])
 * console.log(pool.mergedResponse)
 */
export async function spawnAgentPool(
  userId: string,
  configs: SpawnConfig[]
): Promise<SpawnPoolResult> {
  const startTime = Date.now()

  // Run all agents in parallel
  const settled = await Promise.allSettled(
    configs.map((config) => spawnAgent(userId, config))
  )

  const results: SpawnResult[] = settled.map((s, i) => {
    if (s.status === 'fulfilled') return s.value
    return {
      agentType: configs[i].agentType,
      message: configs[i].message,
      result: {} as AgentExecutionResult,
      error: s.reason instanceof Error ? s.reason.message : String(s.reason),
      success: false,
    }
  })

  const succeeded = results.filter((r) => r.success)
  const failed = results.filter((r) => !r.success)

  // Aggregate token/cost metrics
  let totalCostUsd = 0
  let totalInputTokens = 0
  let totalOutputTokens = 0

  for (const r of succeeded) {
    totalCostUsd += r.result.costUsd ?? 0
    totalInputTokens += r.result.usage?.inputTokens ?? 0
    totalOutputTokens += r.result.usage?.outputTokens ?? 0
  }

  // Merge outputs into unified response
  const mergedResponse = await mergeAgentOutputs(succeeded)

  return {
    results,
    succeeded,
    failed,
    mergedResponse,
    totalCostUsd,
    totalInputTokens,
    totalOutputTokens,
    durationMs: Date.now() - startTime,
  }
}

// =============================================================================
// Complexity Analyser
// =============================================================================

/**
 * Uses Claude to analyse a task description and recommend which agents should
 * be spawned. Returns a ComplexityAnalysis with recommended agent types.
 *
 * @example
 * const analysis = await analyseTaskComplexity(
 *   'Prenoviti celotno kopalnico: nova keramika, nova instalacija, nov tuš'
 * )
 * // analysis.recommendedAgents => ['quote_generator', 'materials_agent', 'job_summary']
 */
export async function analyseTaskComplexity(
  taskDescription: string
): Promise<ComplexityAnalysis> {
  const systemPrompt = `Si AI koordinator na platformi LiftGO za domače storitve v Sloveniji.
Analiziraš opise del in določiš katere AI agente je treba sprožiti.

Razpoložljivi agenti:
- quote_generator: generira cenovne ponudbe (PRO)
- materials_agent: seznam in cene materiala (PRO)
- job_summary: povzetek dela za stranko (PRO)
- work_description: pomaga opisati delo (START)
- offer_comparison: primerja ponudbe (START)
- scheduling_assistant: termini in razpored (START)
- video_diagnosis: analiza slike (PRO)

Odgovori IZKLJUČNO v JSON formatu:
{
  "domains": ["domain1", "domain2"],
  "recommendedAgents": ["agent1", "agent2"],
  "complexity": "simple|moderate|complex",
  "reasoning": "Kratka razlaga zakaj."
}`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Analiziraj naslednje delo:\n\n${taskDescription}`,
      },
    ],
  })

  const textContent = response.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('')

  try {
    const parsed = JSON.parse(textContent) as ComplexityAnalysis
    return parsed
  } catch {
    // Fallback if JSON parsing fails
    return {
      domains: ['general'],
      recommendedAgents: ['work_description'],
      complexity: 'simple',
      reasoning: textContent,
    }
  }
}

// =============================================================================
// Auto-Spawn Based on Complexity
// =============================================================================

/**
 * High-level helper that:
 * 1. Analyses the task complexity using Claude
 * 2. Spawns the recommended agents in parallel
 * 3. Returns merged results
 *
 * @example
 * const result = await autoSpawn(userId, {
 *   taskDescription: 'Prenoviti kopalnico — keramika, instalacija, luči',
 *   taskId: 'task-456',
 * })
 * console.log(result.analysis.complexity)   // 'complex'
 * console.log(result.pool.mergedResponse)
 */
export async function autoSpawn(
  userId: string,
  params: { taskDescription: string; taskId?: string }
): Promise<{ analysis: ComplexityAnalysis; pool: SpawnPoolResult }> {
  const analysis = await analyseTaskComplexity(params.taskDescription)

  const configs: SpawnConfig[] = analysis.recommendedAgents.map((agent) => ({
    agentType: agent,
    message: params.taskDescription,
    additionalContext: params.taskId ? `taskId: ${params.taskId}` : undefined,
    useRAG: false,
  }))

  const pool = await spawnAgentPool(userId, configs)

  return { analysis, pool }
}

// =============================================================================
// Internal: Merge Agent Outputs
// =============================================================================

/**
 * Uses Claude Haiku to merge the outputs of multiple spawned agents
 * into a single coherent response.
 */
async function mergeAgentOutputs(results: SpawnResult[]): Promise<string> {
  if (results.length === 0) return ''
  if (results.length === 1) return results[0].result.response ?? ''

  const outputSections = results
    .map(
      (r, i) =>
        `### Agent ${i + 1}: ${r.agentType}\n${r.result.response ?? '(brez odgovora)'}`
    )
    .join('\n\n')

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: `Si LiftGO AI koordinator. Združi odgovore več AI agentov v eno koherentno sporočilo za uporabnika.
Ohrani vse pomembne informacije. Izogni se ponavljanju. Piši v slovenščini.`,
    messages: [
      {
        role: 'user',
        content: `Združi naslednje odgovore agentov:\n\n${outputSections}`,
      },
    ],
  })

  return response.content
    .filter((b): b is { type: 'text'; text: string } => b.type === 'text')
    .map((b) => b.text)
    .join('')
}
