/**
 * Parallel Execution Pattern
 *
 * Runs multiple AI agents simultaneously using Promise.allSettled.
 * Useful when you need independent analyses that don't depend on each other
 * (e.g., simultaneously running quote_generator, materials_agent, and job_summary
 * for a complex task).
 *
 * All agents run at the same time, reducing total latency significantly.
 */

import { executeAgent, type AgentExecutionResult } from '@/lib/ai/orchestrator'
import type { AIAgentType } from '@/lib/agents/ai-router'

// =============================================================================
// Types
// =============================================================================

export interface ParallelAgentTask {
  /** Unique label for this task (used in results map) */
  label: string
  /** The AI agent type to invoke */
  agentType: AIAgentType
  /** The user message / prompt for this agent */
  userMessage: string
  /** Optional task ID for RAG context */
  taskId?: string
  /** Optional conversation ID for RAG context */
  conversationId?: string
  /** Additional context to inject into the system prompt */
  additionalContext?: string
  /** Whether to use RAG (default: true) */
  useRAG?: boolean
  /** Whether to use tool calling (default: false) */
  useTools?: boolean
}

export interface ParallelAgentOptions {
  /** LiftGO user ID — used for quota checking on each sub-task */
  userId: string
  /** List of agents to run in parallel */
  tasks: ParallelAgentTask[]
  /**
   * Maximum concurrent requests (default: unlimited).
   * Set to e.g. 3 to avoid rate-limiting on Claude API.
   */
  concurrencyLimit?: number
}

export type ParallelTaskStatus = 'fulfilled' | 'rejected'

export interface ParallelTaskResult {
  label: string
  agentType: AIAgentType
  status: ParallelTaskStatus
  result?: AgentExecutionResult
  error?: string
}

export interface ParallelExecutionResult {
  /** Map of label → result for quick access */
  results: Record<string, ParallelTaskResult>
  /** Results that succeeded */
  fulfilled: ParallelTaskResult[]
  /** Results that failed */
  rejected: ParallelTaskResult[]
  /** Total tokens across all fulfilled tasks */
  totalInputTokens: number
  totalOutputTokens: number
  /** Total cost across all fulfilled tasks (USD) */
  totalCostUsd: number
  /** Wall-clock duration (ms) — reflects parallelism benefit */
  totalDurationMs: number
  /** Whether all tasks completed successfully */
  allSucceeded: boolean
}

// =============================================================================
// Core Function
// =============================================================================

/**
 * Runs multiple AI agents in parallel using Promise.allSettled.
 * Individual task failures do not abort the others.
 *
 * @example
 * const result = await runParallelAgents({
 *   userId: 'user-123',
 *   tasks: [
 *     {
 *       label: 'quote',
 *       agentType: 'quote_generator',
 *       userMessage: 'Zamenjava pip, 3 kopalnice',
 *     },
 *     {
 *       label: 'materials',
 *       agentType: 'materials_agent',
 *       userMessage: 'Zamenjava pip, 3 kopalnice — seznam materiala',
 *     },
 *   ],
 * })
 *
 * console.log(result.results.quote.result?.response)
 * console.log(result.results.materials.result?.response)
 */
export async function runParallelAgents(options: ParallelAgentOptions): Promise<ParallelExecutionResult> {
  const { userId, tasks, concurrencyLimit } = options

  const startTime = Date.now()

  // Helper that executes a single task
  const executeTask = (task: ParallelAgentTask): Promise<AgentExecutionResult> =>
    executeAgent({
      userId,
      agentType: task.agentType,
      userMessage: task.userMessage,
      taskId: task.taskId,
      conversationId: task.conversationId,
      additionalContext: task.additionalContext,
      useRAG: task.useRAG ?? true,
      useTools: task.useTools ?? false,
    })

  // Run with optional concurrency limiting via batching
  let settledResults: PromiseSettledResult<AgentExecutionResult>[]

  if (concurrencyLimit && concurrencyLimit < tasks.length) {
    settledResults = await runWithConcurrencyLimit(tasks, executeTask, concurrencyLimit)
  } else {
    settledResults = await Promise.allSettled(tasks.map(executeTask))
  }

  // Build result structures
  const resultsMap: Record<string, ParallelTaskResult> = {}
  const fulfilled: ParallelTaskResult[] = []
  const rejected: ParallelTaskResult[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCostUsd = 0

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]
    const settled = settledResults[i]

    if (settled.status === 'fulfilled') {
      const taskResult: ParallelTaskResult = {
        label: task.label,
        agentType: task.agentType,
        status: 'fulfilled',
        result: settled.value,
      }
      resultsMap[task.label] = taskResult
      fulfilled.push(taskResult)
      totalInputTokens += settled.value.usage.inputTokens
      totalOutputTokens += settled.value.usage.outputTokens
      totalCostUsd += settled.value.costUsd
    } else {
      const errorMsg =
        settled.reason instanceof Error ? settled.reason.message : String(settled.reason)
      const taskResult: ParallelTaskResult = {
        label: task.label,
        agentType: task.agentType,
        status: 'rejected',
        error: errorMsg,
      }
      resultsMap[task.label] = taskResult
      rejected.push(taskResult)
    }
  }

  return {
    results: resultsMap,
    fulfilled,
    rejected,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd,
    totalDurationMs: Date.now() - startTime,
    allSucceeded: rejected.length === 0,
  }
}

// =============================================================================
// Concurrency Limiting Helper
// =============================================================================

/**
 * Executes tasks in batches to respect a concurrency limit.
 * Within each batch, tasks run in parallel. Batches run sequentially.
 */
async function runWithConcurrencyLimit<T, R>(
  items: T[],
  fn: (item: T) => Promise<R>,
  limit: number
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = []

  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit)
    const batchResults = await Promise.allSettled(batch.map(fn))
    results.push(...batchResults)
  }

  return results
}

// =============================================================================
// Convenience Builders
// =============================================================================

/**
 * Runs all PRO craftsman agents in parallel for a given task description.
 * Requires PRO subscription.
 */
export function buildCraftsmanParallelTasks(
  taskDescription: string,
  taskId?: string
): ParallelAgentTask[] {
  return [
    {
      label: 'quote',
      agentType: 'quote_generator',
      userMessage: taskDescription,
      taskId,
      useRAG: true,
    },
    {
      label: 'materials',
      agentType: 'materials_agent',
      userMessage: `Za naslednje delo pripravi seznam materiala:\n\n${taskDescription}`,
      taskId,
      useRAG: false,
    },
    {
      label: 'summary',
      agentType: 'job_summary',
      userMessage: `Povzemi delo za stranko:\n\n${taskDescription}`,
      taskId,
      useRAG: false,
    },
  ]
}

/**
 * Runs customer-tier agents in parallel to help a narocnik understand their request.
 */
export function buildNarocnikParallelTasks(
  taskDescription: string,
  taskId?: string
): ParallelAgentTask[] {
  return [
    {
      label: 'description',
      agentType: 'work_description',
      userMessage: taskDescription,
      taskId,
      useRAG: true,
    },
    {
      label: 'scheduling',
      agentType: 'scheduling_assistant',
      userMessage: `Predlagaj termine za: ${taskDescription}`,
      taskId,
      useRAG: false,
    },
  ]
}
