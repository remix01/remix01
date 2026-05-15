/**
 * DEPRECATED: This file has been moved to /lib/agent/state-machine/
 * 
 * For new code, use:
 * import { assertTransition } from '@/lib/agent/state-machine'
 * 
 * This file remains for backward compatibility with existing imports.
 */

export {
  assertTransition,
  assertEscrowTransition,
  assertInquiryTransition,
  assertOfferTransition,
  assertLeadTransition,
  assertPaymentTransition,
} from '@/lib/agent/state-machine'

export {
  OnboardingStatus,
  LeadStatus,
  PaymentStatus,
  ONBOARDING_TRANSITIONS,
  LEAD_TRANSITIONS,
  PAYMENT_TRANSITIONS,
} from './statuses'

export { assertTransitionValid, TransitionError } from './transition'
