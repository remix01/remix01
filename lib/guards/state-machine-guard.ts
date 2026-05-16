/**
 * state-machine-guard.ts — Canonical entry point for route-handler state validation.
 *
 * Enforces task lifecycle transitions defined in CLAUDE.md before any DB write.
 * Run AFTER permission/auth checks, BEFORE Supabase mutations.
 *
 * Task lifecycle:
 *   draft → open → has_ponudbe → in_progress → completed
 *                       ↓
 *                  cancelled / expired
 */

import { assertTransitionValid, TransitionError } from '@/lib/state-machine/transition'

// ── TASK STATUS ──────────────────────────────────────────────

export const TaskStatus = {
  DRAFT:        'draft',
  OPEN:         'open',
  HAS_PONUDBE:  'has_ponudbe',
  IN_PROGRESS:  'in_progress',
  COMPLETED:    'completed',
  CANCELLED:    'cancelled',
  EXPIRED:      'expired',
} as const

export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus]

export const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  [TaskStatus.DRAFT]:       [TaskStatus.OPEN, TaskStatus.CANCELLED],
  [TaskStatus.OPEN]:        [TaskStatus.HAS_PONUDBE, TaskStatus.CANCELLED, TaskStatus.EXPIRED],
  [TaskStatus.HAS_PONUDBE]: [TaskStatus.IN_PROGRESS, TaskStatus.OPEN, TaskStatus.CANCELLED, TaskStatus.EXPIRED],
  [TaskStatus.IN_PROGRESS]: [TaskStatus.COMPLETED, TaskStatus.CANCELLED],
  [TaskStatus.COMPLETED]:   [],
  [TaskStatus.CANCELLED]:   [],
  [TaskStatus.EXPIRED]:     [],
}

export const TASK_TERMINAL: ReadonlySet<TaskStatus> = new Set([
  TaskStatus.COMPLETED,
  TaskStatus.CANCELLED,
  TaskStatus.EXPIRED,
])

/**
 * Validates a task status transition. Throws TransitionError (code 409) on invalid.
 * Accepts raw strings from DB; validates against the TaskStatus enum.
 */
export function guardTaskTransition(from: string, to: string): void {
  assertTransitionValid(
    from as TaskStatus,
    to as TaskStatus,
    TASK_TRANSITIONS,
    TASK_TERMINAL,
  )
}

// ── RE-EXPORTS for unified import surface ───────────────────

export { TransitionError } from '@/lib/state-machine/transition'
export type { TransitionResult } from '@/lib/state-machine/transition'

export {
  assertTransition,
  assertEscrowTransition,
  assertInquiryTransition,
  assertOfferTransition,
  assertLeadTransition,
  assertPaymentTransition,
} from '@/lib/agent/state-machine'
