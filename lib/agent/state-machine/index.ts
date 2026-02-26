import { assertEscrowTransition } from './escrowMachine'
import { assertInquiryTransition } from './inquiryMachine'
import { assertOfferTransition } from './offerMachine'
import { agentLogger } from '@/lib/observability'
import { anomalyDetector } from '@/lib/observability/alerting'

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
  targetStatus: string,
  sessionId: string = 'unknown'
): Promise<void> {
  try {
    switch (resource) {
      case 'escrow':
        await assertEscrowTransition(id, targetStatus)
        break
      case 'inquiry':
        await assertInquiryTransition(id, targetStatus)
        break
      case 'offer':
        await assertOfferTransition(id, targetStatus)
        break
      default:
        throw {
          code: 400,
          error: `Unknown resource type: ${resource}`,
        }
    }

    // Transition allowed — log success
    agentLogger.logStateTransitionSuccess(sessionId, `${resource}:${id}`, '?', targetStatus)
  } catch (err: any) {
    // Transition blocked — log and record anomaly
    agentLogger.logStateTransitionBlocked(sessionId, `${resource}:${id}`, '?', targetStatus)
    
    // Record state violation for anomaly detection (non-blocking)
    anomalyDetector.record('repeated_state_violations', undefined, sessionId, `${resource}:${id} -> ${targetStatus}`)
    
    throw err
  }
}

export { assertEscrowTransition } from './escrowMachine'
export { assertInquiryTransition } from './inquiryMachine'
export { assertOfferTransition } from './offerMachine'
