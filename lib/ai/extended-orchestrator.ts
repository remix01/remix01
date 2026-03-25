/**
 * Extended AI Orchestrator v2.0
 *
 * Combines all AI Agent Patterns into a single unified interface.
 * Import the `AI` object for a clean, fluent API to all patterns.
 *
 * @example
 * import { AI } from '@/lib/ai/extended-orchestrator'
 *
 * // Sequential pipeline
 * const pipelineResult = await AI.sequential({ userId, initialMessage, steps })
 *
 * // Parallel execution
 * const parallelResult = await AI.parallel({ userId, tasks })
 *
 * // Smart routing
 * const routeResult = await AI.route({ userId, userRole: 'narocnik', message })
 *
 * // Human-in-the-loop
 * const hitlReq = await AI.hitl.create({ executionId, agentName, description, context })
 *
 * // Dynamic spawn
 * const spawnResult = await AI.spawn.auto(userId, { taskDescription })
 */

// Re-export core orchestrator for convenience
export {
  executeAgent,
  analyzeImage,
  AgentAccessError,
  QuotaExceededError,
  type AgentExecutionOptions,
  type AgentExecutionResult,
} from './orchestrator'

// Re-export all patterns
export * from './patterns'

// =============================================================================
// Imports for the AI namespace object
// =============================================================================

import {
  runSequentialPipeline,
  type PipelineOptions,
  type PipelineResult,
} from './patterns/sequential-pipeline'

import {
  runParallelAgents,
  type ParallelAgentOptions,
  type ParallelExecutionResult,
} from './patterns/parallel-execution'

import {
  routeToAgent,
  type RouterInput,
  type RouterResult,
} from './patterns/agent-router'

import {
  createHITLRequest,
  approveRequest,
  rejectRequest,
  getPendingApprovals,
  getApproval,
  subscribeToApprovals,
  waitForApproval,
  type CreateHITLRequestParams,
  type HITLRequestResult,
  type HITLApproval,
  type ApprovalActionResult,
} from './patterns/human-in-the-loop'

import {
  spawnAgent,
  spawnAgentPool,
  analyseTaskComplexity,
  autoSpawn,
  type SpawnConfig,
  type SpawnResult,
  type SpawnPoolResult,
  type ComplexityAnalysis,
} from './patterns/dynamic-spawn'

// =============================================================================
// HITL Namespace
// =============================================================================

/**
 * Human-in-the-Loop namespace — groups all HITL operations.
 */
export const hitl = {
  /** Create a new approval request */
  create: (params: CreateHITLRequestParams): Promise<HITLRequestResult> =>
    createHITLRequest(params),

  /** Approve a pending request */
  approve: (id: string, approverId: string, note?: string): Promise<ApprovalActionResult> =>
    approveRequest(id, approverId, note),

  /** Reject a pending request */
  reject: (id: string, approverId: string, note?: string): Promise<ApprovalActionResult> =>
    rejectRequest(id, approverId, note),

  /** Get all pending approvals for a user */
  getPending: (userId: string): Promise<HITLApproval[]> =>
    getPendingApprovals(userId),

  /** Get a specific approval by ID */
  get: (id: string): Promise<HITLApproval> =>
    getApproval(id),

  /** Subscribe to realtime updates for an execution */
  subscribe: (executionId: string, callback: (approval: HITLApproval) => void): (() => void) =>
    subscribeToApprovals(executionId, callback),

  /** Poll until approval reaches terminal state (server-side) */
  wait: (approvalId: string, options?: { pollIntervalMs?: number; timeoutMs?: number }): Promise<HITLApproval> =>
    waitForApproval(approvalId, options),
}

// =============================================================================
// Spawn Namespace
// =============================================================================

/**
 * Dynamic spawn namespace — groups all agent spawning operations.
 */
export const spawn = {
  /** Spawn a single sub-agent */
  one: (userId: string, config: SpawnConfig): Promise<SpawnResult> =>
    spawnAgent(userId, config),

  /** Spawn a pool of agents in parallel */
  pool: (userId: string, configs: SpawnConfig[]): Promise<SpawnPoolResult> =>
    spawnAgentPool(userId, configs),

  /** Analyse task complexity and get agent recommendations */
  analyse: (taskDescription: string): Promise<ComplexityAnalysis> =>
    analyseTaskComplexity(taskDescription),

  /** Auto-analyse and spawn recommended agents */
  auto: (
    userId: string,
    params: { taskDescription: string; taskId?: string }
  ): Promise<{ analysis: ComplexityAnalysis; pool: SpawnPoolResult }> =>
    autoSpawn(userId, params),
}

// =============================================================================
// Unified AI Object
// =============================================================================

/**
 * The main `AI` namespace — provides a clean, unified API for all patterns.
 *
 * @example
 * import { AI } from '@/lib/ai/extended-orchestrator'
 *
 * const result = await AI.sequential({ ... })
 * const result = await AI.parallel({ ... })
 * const result = await AI.route({ ... })
 * await AI.hitl.create({ ... })
 * await AI.spawn.auto(userId, { ... })
 */
export const AI = {
  /**
   * Run agents sequentially — each step receives the previous step's output.
   */
  sequential: (options: PipelineOptions): Promise<PipelineResult> =>
    runSequentialPipeline(options),

  /**
   * Run agents in parallel — all tasks execute simultaneously.
   */
  parallel: (options: ParallelAgentOptions): Promise<ParallelExecutionResult> =>
    runParallelAgents(options),

  /**
   * Route a message to the best agent based on intent and quota.
   */
  route: (input: RouterInput): Promise<RouterResult> =>
    routeToAgent(input),

  /**
   * Human-in-the-loop operations (create, approve, reject, subscribe, wait).
   */
  hitl,

  /**
   * Dynamic agent spawning (single, pool, auto-analyse).
   */
  spawn,
} as const

// =============================================================================
// Convenience Re-exports for HITL (top-level, for direct import)
// =============================================================================

export {
  getPendingApprovals,
  approveRequest,
  rejectRequest,
  subscribeToApprovals,
}
