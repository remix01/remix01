/**
 * Generic state-machine transition guard.
 *
 * Validates that `from → to` is a legal transition and throws a
 * structured error (code 409) if not.  Works for any status enum —
 * callers pass the transitions map and terminal set.
 */

export interface TransitionResult {
  allowed: true
  from: string
  to: string
}

export class TransitionError extends Error {
  readonly code: number
  readonly from: string
  readonly to: string
  readonly reason: 'TERMINAL_STATE' | 'INVALID_TRANSITION'

  constructor(from: string, to: string, reason: 'TERMINAL_STATE' | 'INVALID_TRANSITION') {
    const msg =
      reason === 'TERMINAL_STATE'
        ? `Cannot transition from terminal state '${from}'`
        : `Invalid transition: ${from} → ${to}`
    super(msg)
    this.name = 'TransitionError'
    this.code = 409
    this.from = from
    this.to = to
    this.reason = reason
  }
}

export function assertTransitionValid<S extends string>(
  currentStatus: S,
  targetStatus: S,
  transitions: Record<S, readonly S[]>,
  terminalStates: ReadonlySet<S>,
): TransitionResult {
  if (terminalStates.has(currentStatus)) {
    throw new TransitionError(currentStatus, targetStatus, 'TERMINAL_STATE')
  }

  const allowed = transitions[currentStatus] ?? []
  if (!allowed.includes(targetStatus)) {
    throw new TransitionError(currentStatus, targetStatus, 'INVALID_TRANSITION')
  }

  return { allowed: true, from: currentStatus, to: targetStatus }
}
