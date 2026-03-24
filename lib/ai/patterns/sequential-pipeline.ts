/**
 * Sequential Pipeline Pattern
 *
 * Chains multiple AI agents in sequence where each step receives
 * the output of the previous step as part of its input context.
 *
 * Use case: Multi-step processing where order matters (e.g., describe job →
 * generate quote → write summary).
 */

import { executeAgent, type AgentExecutionResult } from '@/lib/ai/orchestrator'
import type { AIAgentType } from '@/lib/agents/ai-router'

// =============================================================================
// Types
// =============================================================================

export interface PipelineStep {
  /** The AI agent to invoke at this step */
  agentType: AIAgentType
  /** Static user message for this step (overrides dynamic message if provided) */
  userMessage?: string
  /**
   * Transforms the previous step's output into a user message for this step.
   * If omitted, the previous step's response is used as-is.
   */
  buildMessage?: (previousOutput: string, originalInput: string) => string
  /** Optional additional context injected into this step's system prompt */
  additionalContext?: string
  /** Skip RAG for this step (default: true) */
  useRAG?: boolean
  /** Skip tools for this step (default: false) */
  useTools?: boolean
}

export interface PipelineOptions {
  /** LiftGO user ID — used for quota checking */
  userId: string
  /** The initial user message / task description */
  initialMessage: string
  /** Ordered list of pipeline steps */
  steps: PipelineStep[]
  /** Optional task ID propagated to each step for RAG context */
  taskId?: string
  /** Stop pipeline if any step throws (default: true) */
  failFast?: boolean
}

export interface PipelineStepResult {
  step: number
  agentType: AIAgentType
  input: string
  result: AgentExecutionResult
  skipped: boolean
  error?: string
}

export interface PipelineResult {
  /** Final output from the last successful step */
  finalOutput: string
  /** Results from each step */
  steps: PipelineStepResult[]
  /** Total tokens across all steps */
  totalInputTokens: number
  totalOutputTokens: number
  /** Total cost across all steps (USD) */
  totalCostUsd: number
  /** Total wall-clock duration (ms) */
  totalDurationMs: number
  /** Whether all steps completed successfully */
  success: boolean
}

// =============================================================================
// Core Function
// =============================================================================

/**
 * Runs a series of AI agents sequentially. Each step receives the output of
 * the previous step (transformed via `buildMessage` if provided).
 *
 * @example
 * const result = await runSequentialPipeline({
 *   userId: 'user-123',
 *   initialMessage: 'Zamenjati je treba pipe v kopalnici',
 *   steps: [
 *     { agentType: 'work_description' },
 *     {
 *       agentType: 'quote_generator',
 *       buildMessage: (prev) => `Na podlagi opisa: ${prev}\n\nSestavi ponudbo.`,
 *     },
 *     {
 *       agentType: 'job_summary',
 *       buildMessage: (prev) => `Na podlagi ponudbe: ${prev}\n\nSestavi povzetek.`,
 *     },
 *   ],
 * })
 */
export async function runSequentialPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const { userId, initialMessage, steps, taskId, failFast = true } = options

  const pipelineStart = Date.now()
  const stepResults: PipelineStepResult[] = []

  let currentInput = initialMessage
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCostUsd = 0
  let success = true
  let finalOutput = initialMessage

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]

    // Build the message for this step
    let messageForStep: string
    if (step.userMessage) {
      messageForStep = step.userMessage
    } else if (step.buildMessage) {
      messageForStep = step.buildMessage(currentInput, initialMessage)
    } else {
      messageForStep = currentInput
    }

    try {
      const result = await executeAgent({
        userId,
        agentType: step.agentType,
        userMessage: messageForStep,
        taskId,
        useRAG: step.useRAG ?? true,
        useTools: step.useTools ?? false,
        additionalContext: step.additionalContext,
      })

      stepResults.push({
        step: i + 1,
        agentType: step.agentType,
        input: messageForStep,
        result,
        skipped: false,
      })

      totalInputTokens += result.usage.inputTokens
      totalOutputTokens += result.usage.outputTokens
      totalCostUsd += result.costUsd

      // Pass this step's output to the next step
      currentInput = result.response
      finalOutput = result.response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      stepResults.push({
        step: i + 1,
        agentType: step.agentType,
        input: messageForStep,
        result: {} as AgentExecutionResult,
        skipped: true,
        error: errorMessage,
      })

      success = false

      if (failFast) {
        break
      }
      // If not failFast, continue with the previous output
    }
  }

  return {
    finalOutput,
    steps: stepResults,
    totalInputTokens,
    totalOutputTokens,
    totalCostUsd,
    totalDurationMs: Date.now() - pipelineStart,
    success,
  }
}

// =============================================================================
// Convenience Builders
// =============================================================================

/**
 * Builds a standard LiftGO task-processing pipeline:
 * work_description → quote_generator → job_summary
 */
export function buildTaskProcessingPipeline(overrides?: Partial<PipelineStep>[]): PipelineStep[] {
  const defaults: PipelineStep[] = [
    {
      agentType: 'work_description',
      useRAG: true,
    },
    {
      agentType: 'quote_generator',
      buildMessage: (prev) =>
        `Na podlagi opisa dela:\n\n${prev}\n\nSestavi strukturirano cenovno ponudbo.`,
      useRAG: false,
    },
    {
      agentType: 'job_summary',
      buildMessage: (prev) =>
        `Na podlagi ponudbe:\n\n${prev}\n\nSestavi povzetek dela za stranko.`,
      useRAG: false,
    },
  ]

  if (overrides) {
    return defaults.map((step, i) => ({ ...step, ...(overrides[i] ?? {}) }))
  }

  return defaults
}

/**
 * Builds a ponudba (offer) evaluation pipeline:
 * offer_comparison → scheduling_assistant
 */
export function buildOfferEvaluationPipeline(): PipelineStep[] {
  return [
    {
      agentType: 'offer_comparison',
      useRAG: true,
    },
    {
      agentType: 'scheduling_assistant',
      buildMessage: (prev) =>
        `Na podlagi primerjave ponudb:\n\n${prev}\n\nPomagaj uskladiti termin za izbrano ponudbo.`,
      useRAG: false,
    },
  ]
}
