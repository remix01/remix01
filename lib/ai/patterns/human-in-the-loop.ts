/**
 * Human-in-the-Loop (HITL) Pattern
 *
 * Pauses AI agent execution and waits for explicit human approval before
 * proceeding. Approval requests are persisted in the `hitl_approvals` table
 * and surfaced via Supabase Realtime so UIs can react instantly.
 *
 * Typical use cases in LiftGO:
 * - Admin approval before auto-publishing a quote
 * - Obrtnik confirmation before sending a generated offer to a narocnik
 * - Manager review of large-value transactions flagged by AI
 */

import { createClient } from '@supabase/supabase-js'

// =============================================================================
// Supabase Client
// =============================================================================

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder'
)

// =============================================================================
// Types
// =============================================================================

export type HITLStatus = 'pending' | 'approved' | 'rejected'

export interface HITLApproval {
  id: string
  execution_id: string
  agent_name: string
  description: string
  context: Record<string, unknown>
  status: HITLStatus
  approver_id: string | null
  approver_note: string | null
  created_at: string
  updated_at: string
}

export interface CreateHITLRequestParams {
  /** Unique ID for the overall agent execution (e.g. a UUID you generate) */
  executionId: string
  /** The agent type that is requesting approval */
  agentName: string
  /** Human-readable description of what needs approval */
  description: string
  /** Arbitrary context the approver needs to make a decision */
  context: Record<string, unknown>
}

export interface HITLRequestResult {
  approvalId: string
  executionId: string
  status: HITLStatus
  createdAt: string
}

export interface ApprovalActionResult {
  approvalId: string
  newStatus: HITLStatus
  approverId: string
  note: string | null
  updatedAt: string
}

// =============================================================================
// Create Request
// =============================================================================

/**
 * Saves a new HITL approval request to Supabase.
 * Call this when an AI agent reaches a decision point that requires human review.
 *
 * @example
 * const req = await createHITLRequest({
 *   executionId: 'exec-abc123',
 *   agentName: 'quote_generator',
 *   description: 'Pregledaj in potrdi samodejno generirano ponudbo pred pošiljanjem',
 *   context: { taskId: 'task-123', quoteTotal: 850, currency: 'EUR' },
 * })
 * // Pause here — wait for approval via subscribeToApprovals
 */
export async function createHITLRequest(
  params: CreateHITLRequestParams
): Promise<HITLRequestResult> {
  const { executionId, agentName, description, context } = params

  const { data, error } = await supabaseAdmin
    .from('hitl_approvals')
    .insert({
      execution_id: executionId,
      agent_name: agentName,
      description,
      context,
      status: 'pending' as HITLStatus,
      approver_id: null,
      approver_note: null,
    })
    .select('id, execution_id, status, created_at')
    .single()

  if (error || !data) {
    throw new HITLError(`Napaka pri ustvarjanju HITL zahteve: ${error?.message ?? 'unknown error'}`)
  }

  return {
    approvalId: data.id,
    executionId: data.execution_id,
    status: data.status as HITLStatus,
    createdAt: data.created_at,
  }
}

// =============================================================================
// Approve / Reject
// =============================================================================

/**
 * Approves a pending HITL request.
 *
 * @param id - The `hitl_approvals.id` to approve
 * @param approverId - The LiftGO user ID of the approver
 * @param note - Optional note explaining the approval
 */
export async function approveRequest(
  id: string,
  approverId: string,
  note?: string
): Promise<ApprovalActionResult> {
  return updateApprovalStatus(id, 'approved', approverId, note ?? null)
}

/**
 * Rejects a pending HITL request.
 *
 * @param id - The `hitl_approvals.id` to reject
 * @param approverId - The LiftGO user ID of the rejector
 * @param note - Optional note explaining why it was rejected
 */
export async function rejectRequest(
  id: string,
  approverId: string,
  note?: string
): Promise<ApprovalActionResult> {
  return updateApprovalStatus(id, 'rejected', approverId, note ?? null)
}

async function updateApprovalStatus(
  id: string,
  status: 'approved' | 'rejected',
  approverId: string,
  note: string | null
): Promise<ApprovalActionResult> {
  const updatedAt = new Date().toISOString()

  const { data, error } = await supabaseAdmin
    .from('hitl_approvals')
    .update({
      status,
      approver_id: approverId,
      approver_note: note,
      updated_at: updatedAt,
    })
    .eq('id', id)
    .eq('status', 'pending') // Guard: only update pending requests
    .select('id, status, approver_id, approver_note, updated_at')
    .single()

  if (error || !data) {
    throw new HITLError(
      `Napaka pri posodabljanju HITL statusa: ${error?.message ?? 'request not found or already processed'}`
    )
  }

  return {
    approvalId: data.id,
    newStatus: data.status as HITLStatus,
    approverId: data.approver_id,
    note: data.approver_note,
    updatedAt: data.updated_at,
  }
}

// =============================================================================
// Query
// =============================================================================

/**
 * Returns all pending approval requests for a given user (as approver).
 * Useful for building an admin inbox / notification panel.
 *
 * @param userId - The LiftGO user ID who should see these approvals
 */
export async function getPendingApprovals(userId: string): Promise<HITLApproval[]> {
  // Return approvals where the user is the intended approver OR approvals
  // without a designated approver (open to any authorised user).
  const { data, error } = await supabaseAdmin
    .from('hitl_approvals')
    .select('*')
    .eq('status', 'pending')
    .or(`approver_id.is.null,approver_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error) {
    throw new HITLError(`Napaka pri pridobivanju čakajočih odobrenj: ${error.message}`)
  }

  return (data ?? []) as HITLApproval[]
}

/**
 * Returns the latest state of a specific approval request.
 */
export async function getApproval(id: string): Promise<HITLApproval> {
  const { data, error } = await supabaseAdmin
    .from('hitl_approvals')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new HITLError(`HITL zahteva ${id} ni bila najdena: ${error?.message ?? 'not found'}`)
  }

  return data as HITLApproval
}

// =============================================================================
// Realtime Subscription
// =============================================================================

/**
 * Subscribes to Supabase Realtime for updates on a specific execution's approval.
 * Calls `callback` whenever the status changes.
 *
 * Returns an unsubscribe function — call it when you no longer need updates.
 *
 * @example
 * const unsubscribe = subscribeToApprovals('exec-abc123', (approval) => {
 *   if (approval.status === 'approved') {
 *     continueExecution()
 *   } else if (approval.status === 'rejected') {
 *     abortExecution()
 *   }
 * })
 *
 * // Later, when done:
 * unsubscribe()
 */
export function subscribeToApprovals(
  executionId: string,
  callback: (approval: HITLApproval) => void
): () => void {
  // Use a browser-side Supabase client for realtime (service role not needed)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'
  )

  const channel = supabase
    .channel(`hitl:${executionId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'hitl_approvals',
        filter: `execution_id=eq.${executionId}`,
      },
      (payload) => {
        callback(payload.new as HITLApproval)
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

// =============================================================================
// Wait-for-Approval Helper (Server-side polling)
// =============================================================================

/**
 * Polls Supabase until the approval reaches a terminal state (approved or rejected).
 * Useful in server-side agent loops where you cannot use realtime subscriptions.
 *
 * @param approvalId - The hitl_approvals.id to poll
 * @param options.pollIntervalMs - How often to poll in ms (default: 3000)
 * @param options.timeoutMs - Max wait time in ms (default: 300000 = 5 min)
 */
export async function waitForApproval(
  approvalId: string,
  options: { pollIntervalMs?: number; timeoutMs?: number } = {}
): Promise<HITLApproval> {
  const { pollIntervalMs = 3000, timeoutMs = 300_000 } = options
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const approval = await getApproval(approvalId)

    if (approval.status !== 'pending') {
      return approval
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs))
  }

  throw new HITLTimeoutError(
    `HITL odobritev ${approvalId} ni bila sprejeta v ${timeoutMs / 1000}s`
  )
}

// =============================================================================
// Error Classes
// =============================================================================

export class HITLError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HITLError'
  }
}

export class HITLTimeoutError extends HITLError {
  constructor(message: string) {
    super(message)
    this.name = 'HITLTimeoutError'
  }
}
