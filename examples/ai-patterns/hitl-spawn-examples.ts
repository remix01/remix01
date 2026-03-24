/**
 * LiftGO AI Patterns — HITL & Dynamic Spawn Examples
 *
 * Practical examples for the Human-in-the-Loop and Dynamic Spawn patterns.
 *
 * These are illustrative examples — not production API routes.
 */

import { v4 as uuidv4 } from 'uuid'
import { AI, hitl, spawn } from '@/lib/ai/extended-orchestrator'
import {
  HITLError,
  HITLTimeoutError,
  waitForApproval,
} from '@/lib/ai/patterns/human-in-the-loop'
import { analyseTaskComplexity } from '@/lib/ai/patterns/dynamic-spawn'

// =============================================================================
// Example 1: HITL — Auto-generate quote, require approval before sending
// =============================================================================

/**
 * Generates a quote with AI, then pauses for the obrtnik (or admin) to approve
 * before the quote is sent to the narocnik.
 *
 * Server-side flow using polling (waitForApproval).
 */
export async function generateAndApproveQuote(
  userId: string,
  taskId: string,
  taskDescription: string
): Promise<{ sent: boolean; quote?: string; rejectionNote?: string }> {
  const executionId = uuidv4()

  // Step 1: Generate quote with AI
  const quoteResult = await AI.route({
    userId,
    userRole: 'obrtnik',
    message: taskDescription,
    agentOverride: 'quote_generator',
    taskId,
    useRAG: true,
  })

  const generatedQuote = quoteResult.executionResult.response

  // Step 2: Create HITL approval request (pauses execution)
  const approvalReq = await AI.hitl.create({
    executionId,
    agentName: 'quote_generator',
    description: 'Pregledaj samodejno generirano ponudbo pred pošiljanjem naročniku',
    context: {
      taskId,
      quote: generatedQuote,
      model: quoteResult.executionResult.modelId,
      costUsd: quoteResult.executionResult.costUsd,
    },
  })

  console.log(`HITL request created: ${approvalReq.approvalId}`)
  console.log('Waiting for human approval...')

  // Step 3: Wait for approval (server-side polling, max 5 minutes)
  let approval
  try {
    approval = await AI.hitl.wait(approvalReq.approvalId, {
      pollIntervalMs: 5000,
      timeoutMs: 300_000,
    })
  } catch (error) {
    if (error instanceof HITLTimeoutError) {
      console.warn('Approval timed out — quote not sent')
      return { sent: false }
    }
    throw error
  }

  // Step 4: Act on the decision
  if (approval.status === 'approved') {
    // TODO: Actually send the quote to the narocnik via your messaging system
    console.log('Quote approved and sent to narocnik')
    return { sent: true, quote: generatedQuote }
  } else {
    console.log('Quote rejected:', approval.approver_note)
    return { sent: false, rejectionNote: approval.approver_note ?? undefined }
  }
}

// =============================================================================
// Example 2: HITL — Admin inbox (fetch pending approvals)
// =============================================================================

/**
 * Fetch all pending HITL approvals for an admin user.
 * Useful for building an admin dashboard notification panel.
 */
export async function getAdminApprovalInbox(adminUserId: string) {
  const pending = await AI.hitl.getPending(adminUserId)

  return pending.map((approval) => ({
    id: approval.id,
    executionId: approval.execution_id,
    agent: approval.agent_name,
    description: approval.description,
    context: approval.context,
    createdAt: approval.created_at,
    ageMinutes: Math.floor(
      (Date.now() - new Date(approval.created_at).getTime()) / 60_000
    ),
  }))
}

// =============================================================================
// Example 3: HITL — Approve/reject from admin action
// =============================================================================

/**
 * Admin approves or rejects a HITL request from an API route or server action.
 */
export async function handleAdminDecision(
  approvalId: string,
  adminUserId: string,
  decision: 'approved' | 'rejected',
  note?: string
) {
  try {
    if (decision === 'approved') {
      const result = await AI.hitl.approve(approvalId, adminUserId, note)
      return { success: true, newStatus: result.newStatus }
    } else {
      const result = await AI.hitl.reject(approvalId, adminUserId, note)
      return { success: true, newStatus: result.newStatus }
    }
  } catch (error) {
    if (error instanceof HITLError) {
      return { success: false, error: error.message }
    }
    throw error
  }
}

// =============================================================================
// Example 4: HITL — Realtime subscription in a React component (client-side)
// =============================================================================

/**
 * React hook pattern for subscribing to HITL approval updates.
 * Use this in an obrtnik dashboard to show real-time status of pending approvals.
 *
 * Note: This is a pattern example — import React in your actual component file.
 */
export function createHITLRealtimeHandler(
  executionId: string,
  onApproved: (note?: string | null) => void,
  onRejected: (note?: string | null) => void
): () => void {
  const unsubscribe = AI.hitl.subscribe(executionId, (approval) => {
    if (approval.status === 'approved') {
      onApproved(approval.approver_note)
    } else if (approval.status === 'rejected') {
      onRejected(approval.approver_note)
    }
  })

  return unsubscribe
}

// =============================================================================
// Example 5: Dynamic Spawn — Analyse task and spawn agents automatically
// =============================================================================

/**
 * For a complex renovation task, auto-analyse complexity and spawn the
 * recommended agents. Claude decides which agents are needed.
 */
export async function handleComplexRenovation(userId: string, taskId: string) {
  const taskDescription =
    'Prenoviti kopalnico 8m²: nova keramika na tleh in stenah, menjava kopalne kadi z tušem, ' +
    'nova instalacija z bojlerjem, električna talno gretje, nova razsvetljava'

  const { analysis, pool } = await AI.spawn.auto(userId, { taskDescription, taskId })

  console.log(`Complexity: ${analysis.complexity}`)
  console.log(`Domains detected: ${analysis.domains.join(', ')}`)
  console.log(`Agents spawned: ${analysis.recommendedAgents.join(', ')}`)
  console.log(`Agents succeeded: ${pool.succeeded.length}/${pool.results.length}`)
  console.log(`Total cost: ${pool.totalCostUsd.toFixed(4)} USD`)
  console.log(`Duration: ${pool.durationMs}ms`)
  console.log('\nMerged response:\n', pool.mergedResponse)

  return {
    analysis,
    mergedResponse: pool.mergedResponse,
    agentOutputs: pool.succeeded.map((r) => ({
      agent: r.agentType,
      response: r.result.response,
    })),
    totalCostUsd: pool.totalCostUsd,
  }
}

// =============================================================================
// Example 6: Dynamic Spawn — Explicit pool with custom messages
// =============================================================================

/**
 * Spawn a specific set of agents with tailored messages per agent.
 * More control than autoSpawn.
 */
export async function runSpecialistAnalysis(
  userId: string,
  taskDescription: string,
  taskId: string
) {
  const poolResult = await AI.spawn.pool(userId, [
    {
      agentType: 'quote_generator',
      message: `Pripravi podrobno ponudbo za: ${taskDescription}`,
      additionalContext: `Naloga ID: ${taskId}`,
      useRAG: false,
    },
    {
      agentType: 'materials_agent',
      message: `Kateri materiali so potrebni za: ${taskDescription}? Navedi količine in okvirne cene.`,
      useRAG: false,
    },
  ])

  return {
    quote: poolResult.results.find((r) => r.agentType === 'quote_generator')?.result?.response,
    materials: poolResult.results.find((r) => r.agentType === 'materials_agent')?.result?.response,
    merged: poolResult.mergedResponse,
    allSucceeded: poolResult.failed.length === 0,
  }
}

// =============================================================================
// Example 7: Dynamic Spawn — Analyse complexity before deciding to spawn
// =============================================================================

/**
 * First check complexity, then decide whether to spawn multiple agents
 * or just run a single agent for simple tasks.
 */
export async function adaptiveProcessing(
  userId: string,
  taskDescription: string,
  taskId: string
) {
  // Step 1: Check complexity
  const analysis = await AI.spawn.analyse(taskDescription)

  if (analysis.complexity === 'simple') {
    // Simple task: just run one agent
    const result = await AI.route({
      userId,
      userRole: 'obrtnik',
      message: taskDescription,
      taskId,
    })
    return {
      mode: 'single',
      agent: result.selectedAgent,
      response: result.executionResult.response,
    }
  }

  // Complex task: spawn all recommended agents
  const configs = analysis.recommendedAgents.map((agent) => ({
    agentType: agent,
    message: taskDescription,
    additionalContext: `taskId: ${taskId}`,
    useRAG: false,
  }))

  const pool = await AI.spawn.pool(userId, configs)

  return {
    mode: 'pool',
    agentsUsed: analysis.recommendedAgents,
    response: pool.mergedResponse,
    totalCostUsd: pool.totalCostUsd,
  }
}

// =============================================================================
// Example 8: Combined HITL + Spawn — Full autonomous workflow with approval
// =============================================================================

/**
 * Full workflow:
 * 1. Analyse task complexity with AI
 * 2. Spawn recommended agents in parallel
 * 3. Request human approval for the merged result
 * 4. Return the approved output or rejection reason
 *
 * This demonstrates combining two patterns together.
 */
export async function autonomousWorkflowWithApproval(
  userId: string,
  adminUserId: string,
  taskDescription: string,
  taskId: string
): Promise<{
  approved: boolean
  mergedOutput?: string
  rejectionNote?: string
  totalCostUsd: number
}> {
  const executionId = uuidv4()

  // Phase 1: Spawn agents
  const { analysis, pool } = await AI.spawn.auto(userId, { taskDescription, taskId })

  if (pool.succeeded.length === 0) {
    throw new Error('All spawned agents failed — cannot continue')
  }

  // Phase 2: Create HITL request for the merged result
  const approvalReq = await AI.hitl.create({
    executionId,
    agentName: 'orchestrator',
    description: `Pregledaj AI-generirani povzetek za ${analysis.complexity} nalogo`,
    context: {
      taskId,
      complexity: analysis.complexity,
      domains: analysis.domains,
      agentsUsed: analysis.recommendedAgents,
      mergedOutput: pool.mergedResponse,
      totalCostUsd: pool.totalCostUsd,
      agentOutputs: pool.succeeded.map((r) => ({
        agent: r.agentType,
        preview: r.result.response?.slice(0, 200),
      })),
    },
  })

  // Phase 3: Wait for human decision (server-side poll, 10 min timeout)
  let approval
  try {
    approval = await waitForApproval(approvalReq.approvalId, {
      pollIntervalMs: 3000,
      timeoutMs: 600_000,
    })
  } catch (error) {
    if (error instanceof HITLTimeoutError) {
      return { approved: false, totalCostUsd: pool.totalCostUsd }
    }
    throw error
  }

  if (approval.status === 'approved') {
    return {
      approved: true,
      mergedOutput: pool.mergedResponse,
      totalCostUsd: pool.totalCostUsd,
    }
  }

  return {
    approved: false,
    rejectionNote: approval.approver_note ?? undefined,
    totalCostUsd: pool.totalCostUsd,
  }
}
