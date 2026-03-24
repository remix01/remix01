/**
 * LiftGO AI Patterns — Usage Examples
 *
 * Practical examples for Sequential Pipeline, Parallel Execution,
 * and Agent Router patterns in the LiftGO context.
 *
 * These are illustrative examples — not production API routes.
 * Copy the patterns into your Next.js route handlers as needed.
 */

import { AI } from '@/lib/ai/extended-orchestrator'
import {
  buildTaskProcessingPipeline,
  buildOfferEvaluationPipeline,
  buildCraftsmanParallelTasks,
  buildNarocnikParallelTasks,
} from '@/lib/ai/patterns'

// =============================================================================
// Example 1: Sequential Pipeline — Process a new task request
// =============================================================================

/**
 * When a narocnik submits a new job request, run it through a 3-step pipeline:
 * 1. work_description — refine the job description
 * 2. quote_generator — generate an estimated quote
 * 3. job_summary — produce a customer-friendly summary
 */
export async function processNewTaskRequest(userId: string, taskDescription: string, taskId: string) {
  const result = await AI.sequential({
    userId,
    initialMessage: taskDescription,
    taskId,
    steps: buildTaskProcessingPipeline(),
    failFast: true,
  })

  if (!result.success) {
    const failedStep = result.steps.find((s) => s.skipped)
    console.error(`Pipeline failed at step ${failedStep?.step}: ${failedStep?.error}`)
    return null
  }

  console.log('Pipeline completed in', result.totalDurationMs, 'ms')
  console.log('Total cost:', result.totalCostUsd.toFixed(4), 'USD')
  console.log('Final output:', result.finalOutput)

  return {
    finalSummary: result.finalOutput,
    steps: result.steps.map((s) => ({
      agent: s.agentType,
      output: s.result?.response,
    })),
    totalCostUsd: result.totalCostUsd,
  }
}

// =============================================================================
// Example 2: Sequential Pipeline — Evaluate received ponudbe
// =============================================================================

/**
 * After a narocnik receives multiple ponudbe (offers), run a 2-step pipeline:
 * 1. offer_comparison — analyse and rank the offers
 * 2. scheduling_assistant — suggest a meeting time with the winner
 */
export async function evaluatePonudbe(userId: string, offerContext: string, taskId: string) {
  const result = await AI.sequential({
    userId,
    initialMessage: offerContext,
    taskId,
    steps: buildOfferEvaluationPipeline(),
  })

  return {
    recommendation: result.steps[0]?.result?.response,
    schedulingSuggestion: result.finalOutput,
    success: result.success,
  }
}

// =============================================================================
// Example 3: Sequential Pipeline — Custom steps with buildMessage
// =============================================================================

/**
 * Two-step pipeline where the second step is explicitly built from the first
 * step's output using buildMessage.
 */
export async function describeAndQuote(userId: string, rawInput: string) {
  return AI.sequential({
    userId,
    initialMessage: rawInput,
    steps: [
      {
        agentType: 'work_description',
        useRAG: true,
      },
      {
        agentType: 'quote_generator',
        buildMessage: (prev, original) =>
          `Naročnik je opisal: "${original}"\n\n` +
          `AI je razdelal opis:\n${prev}\n\n` +
          `Na podlagi tega sestavi podrobno cenovno ponudbo v EUR.`,
        useRAG: false,
      },
    ],
  })
}

// =============================================================================
// Example 4: Parallel Execution — All craftsman agents simultaneously
// =============================================================================

/**
 * PRO obrtnik submits a quote. Run quote_generator, materials_agent, and
 * job_summary in parallel to save time.
 */
export async function runCraftsmanAnalysis(userId: string, taskDescription: string, taskId: string) {
  const tasks = buildCraftsmanParallelTasks(taskDescription, taskId)

  const result = await AI.parallel({ userId, tasks })

  if (!result.allSucceeded) {
    console.warn('Some parallel agents failed:', result.rejected.map((r) => r.label))
  }

  return {
    quote: result.results.quote?.result?.response,
    materials: result.results.materials?.result?.response,
    summary: result.results.summary?.result?.response,
    totalCostUsd: result.totalCostUsd,
    durationMs: result.totalDurationMs,
  }
}

// =============================================================================
// Example 5: Parallel Execution — Narocnik helpers
// =============================================================================

/**
 * Simultaneously help a narocnik describe their job and suggest scheduling options.
 * Runs two START-tier agents in parallel.
 */
export async function helpNarocnikWithTask(
  userId: string,
  taskDescription: string,
  taskId: string
) {
  const tasks = buildNarocnikParallelTasks(taskDescription, taskId)

  const result = await AI.parallel({ userId, tasks, concurrencyLimit: 2 })

  return {
    improvedDescription: result.results.description?.result?.response,
    schedulingOptions: result.results.scheduling?.result?.response,
    success: result.allSucceeded,
  }
}

// =============================================================================
// Example 6: Parallel Execution — Custom task set
// =============================================================================

/**
 * Run three completely custom parallel agents for a complex renovation request.
 */
export async function analyseRenovationRequest(userId: string, taskId: string) {
  const description = 'Prenova kopalnice: nova keramika 15m², zamenjava pipe, nova luč'

  const result = await AI.parallel({
    userId,
    tasks: [
      {
        label: 'cost_estimate',
        agentType: 'quote_generator',
        userMessage: `Oceni stroške: ${description}`,
        taskId,
      },
      {
        label: 'material_list',
        agentType: 'materials_agent',
        userMessage: `Pripravi seznam materiala: ${description}`,
        taskId,
      },
      {
        label: 'work_plan',
        agentType: 'job_summary',
        userMessage: `Sestavi plan dela: ${description}`,
        taskId,
      },
    ],
    concurrencyLimit: 3,
  })

  return result
}

// =============================================================================
// Example 7: Agent Router — Auto-route narocnik message
// =============================================================================

/**
 * Route a narocnik's chat message to the most appropriate agent automatically.
 * The router classifies intent from keywords and user role.
 */
export async function routeNarocnikMessage(
  userId: string,
  message: string,
  taskId?: string
) {
  try {
    const result = await AI.route({
      userId,
      userRole: 'narocnik',
      message,
      taskId,
      useRAG: true,
    })

    console.log(`Routed to: ${result.selectedAgent} (reason: ${result.selectionReason})`)
    console.log(`Quota remaining: ${result.dailyLimit - result.dailyUsage - 1}/${result.dailyLimit}`)

    return {
      agent: result.selectedAgent,
      reason: result.selectionReason,
      response: result.executionResult.response,
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      return { error: 'Dnevna kvota dosežena. Nadgradite na PRO za več klicev.' }
    }
    if (error instanceof Error && error.name === 'AgentAccessError') {
      return { error: 'Ta agent zahteva PRO naročnino.' }
    }
    throw error
  }
}

// =============================================================================
// Example 8: Agent Router — Obrtnik message with explicit override
// =============================================================================

/**
 * Force-route an obrtnik message to quote_generator, bypassing auto-classification.
 */
export async function generateQuoteForObrtnik(
  userId: string,
  taskDescription: string,
  taskId: string
) {
  const result = await AI.route({
    userId,
    userRole: 'obrtnik',
    message: taskDescription,
    agentOverride: 'quote_generator',
    taskId,
    useRAG: true,
  })

  return {
    quote: result.executionResult.response,
    costUsd: result.executionResult.costUsd,
    model: result.executionResult.modelId,
  }
}

// =============================================================================
// Example 9: Agent Router — Compare ponudbe for narocnik
// =============================================================================

/**
 * Use the router to compare ponudbe. The router will detect 'primerjaj ponudbe'
 * and route to offer_comparison automatically.
 */
export async function comparePonudbe(
  userId: string,
  taskId: string
) {
  return AI.route({
    userId,
    userRole: 'narocnik',
    message: 'Primerjaj ponudbe ki sem jih dobil za to povpraševanje in mi povej katera je najboljša',
    taskId,
    useRAG: true,  // RAG will pull in the actual ponudbe from DB
  })
}
