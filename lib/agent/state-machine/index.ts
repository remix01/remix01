import { assertEscrowTransition } from './escrowMachine'
import { assertInquiryTransition } from './inquiryMachine'
import { assertOfferTransition } from './offerMachine'

export type ResourceType = 'escrow' | 'inquiry' | 'offer'

/**
 * State Machine Guard - Main entry point
 * Enforces valid state transitions for all entities
 * Runs AFTER permission checks, BEFORE DB writes
 * 
 * All transitions are logged to audit tables for compliance and debugging.
 * Terminal states (released, refunded, completed, closed, etc.) are NEVER allowed to transition further.
 * No transition is allowed unless explicitly defined in the state machine.
 */
export async function assertTransition(
  resource: ResourceType,
  id: string,
  targetStatus: string
): Promise<void> {
  switch (resource) {
    case 'escrow':
      return assertEscrowTransition(id, targetStatus)
    case 'inquiry':
      return assertInquiryTransition(id, targetStatus)
    case 'offer':
      return assertOfferTransition(id, targetStatus)
    default:
      throw {
        code: 400,
        error: `Unknown resource type: ${resource}`,
      }
  }
}

export { assertEscrowTransition } from './escrowMachine'
export { assertInquiryTransition } from './inquiryMachine'
export { assertOfferTransition } from './offerMachine'
