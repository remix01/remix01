/**
 * LiftGO AI Agent Patterns v2.0
 *
 * Barrel export for all AI execution patterns.
 *
 * Available patterns:
 * - Sequential Pipeline  — chain agents one after another
 * - Parallel Execution   — run agents concurrently
 * - Agent Router         — smart intent-based routing with quota enforcement
 * - Human-in-the-Loop   — pause for human approval before continuing
 * - Dynamic Spawn        — spawn sub-agents based on task complexity
 */

// Sequential Pipeline
export {
  runSequentialPipeline,
  buildTaskProcessingPipeline,
  buildOfferEvaluationPipeline,
  type PipelineStep,
  type PipelineOptions,
  type PipelineStepResult,
  type PipelineResult,
} from './sequential-pipeline'

// Parallel Execution
export {
  runParallelAgents,
  buildCraftsmanParallelTasks,
  buildNarocnikParallelTasks,
  type ParallelAgentTask,
  type ParallelAgentOptions,
  type ParallelTaskResult,
  type ParallelExecutionResult,
  type ParallelTaskStatus,
} from './parallel-execution'

// Agent Router
export {
  routeToAgent,
  classifyIntent,
  getAgentQuotaMetrics,
  getAllAgentQuotaMetrics,
  type UserRole,
  type RouterInput,
  type RouterResult,
  type RouterMetrics,
} from './agent-router'

// Human-in-the-Loop
export {
  createHITLRequest,
  approveRequest,
  rejectRequest,
  getPendingApprovals,
  getApproval,
  subscribeToApprovals,
  waitForApproval,
  HITLError,
  HITLTimeoutError,
  type HITLApproval,
  type HITLStatus,
  type CreateHITLRequestParams,
  type HITLRequestResult,
  type ApprovalActionResult,
} from './human-in-the-loop'

// Dynamic Spawn
export {
  spawnAgent,
  spawnAgentPool,
  analyseTaskComplexity,
  autoSpawn,
  type SpawnConfig,
  type SpawnResult,
  type SpawnPoolResult,
  type ComplexityAnalysis,
} from './dynamic-spawn'
