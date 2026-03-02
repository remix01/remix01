/**
 * State Machine Guard
 * 
 * Validates state transitions for entities (tasks, inquiries, offers, escrows)
 * Prevents invalid state progressions through enforced rules.
 */

export type EntityType = 'task' | 'inquiry' | 'offer' | 'escrow'

const VALID_TRANSITIONS: Record<EntityType, Record<string, string[]>> = {
  task: {
    draft: ['published', 'cancelled'],
    published: ['matched', 'cancelled'],
    matched: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
  },
  inquiry: {
    created: ['matched', 'cancelled'],
    matched: ['accepted', 'rejected', 'cancelled'],
    accepted: ['completed', 'cancelled'],
    rejected: [],
    completed: [],
    cancelled: [],
  },
  offer: {
    proposed: ['accepted', 'rejected', 'withdrawn'],
    accepted: ['completed', 'cancelled'],
    rejected: [],
    withdrawn: [],
    completed: [],
    cancelled: [],
  },
  escrow: {
    pending: ['held', 'released', 'forfeited'],
    held: ['released', 'forfeited', 'disputed'],
    disputed: ['released', 'forfeited'],
    released: [],
    forfeited: [],
  },
}

/**
 * Assert that a state transition is valid
 * @param entityType - Type of entity (task, inquiry, offer, escrow)
 * @param currentStatus - Current state
 * @param newStatus - Desired new state
 * @throws Error if transition is invalid
 */
export function assertTransition(
  entityType: EntityType,
  currentStatus: string,
  newStatus: string
): void {
  const transitions = VALID_TRANSITIONS[entityType] ?? {}
  const allowed = transitions[currentStatus] ?? []

  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid ${entityType} state transition: ${currentStatus} → ${newStatus}. ` +
      `Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none (final state)'}`
    )
  }
}

/**
 * Check if a transition is valid without throwing
 * @param entityType - Type of entity
 * @param currentStatus - Current state
 * @param newStatus - Desired new state
 * @returns true if transition is valid, false otherwise
 */
export function isValidTransition(
  entityType: EntityType,
  currentStatus: string,
  newStatus: string
): boolean {
  const transitions = VALID_TRANSITIONS[entityType] ?? {}
  const allowed = transitions[currentStatus] ?? []
  return allowed.includes(newStatus)
}

/**
 * Get all valid next states for current status
 * @param entityType - Type of entity
 * @param currentStatus - Current state
 * @returns Array of valid next states
 */
export function getValidTransitions(
  entityType: EntityType,
  currentStatus: string
): string[] {
  const transitions = VALID_TRANSITIONS[entityType] ?? {}
  return transitions[currentStatus] ?? []
}
