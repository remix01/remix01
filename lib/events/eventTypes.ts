/**
 * Event Type Definitions — Slim payload contracts
 * 
 * Each event contains ONLY:
 * - Entity IDs (taskId, customerId, partnerId, etc.)
 * - Primitive values (scores, prices, ratings)
 * - Timestamps (createdAt, sentAt, etc.)
 * 
 * Subscribers fetch detailed data from DB as needed.
 * This keeps event payloads small and prevents PII leakage.
 */

export interface TaskCreatedPayload {
  taskId: string
  customerId: string
  categoryId: string
  lat: number
  lng: number
  createdAt: string
}

export interface TaskMatchedPayload {
  taskId: string
  matchIds: string[]
  topPartnerId: string
  topScore: number
  matchedAt: string
  deadlineAt: string
}

export interface TaskAcceptedPayload {
  taskId: string
  customerId: string
  partnerId: string
  offerId: string
  agreedPrice: number
  acceptedAt: string
}

export interface TaskCompletedPayload {
  taskId: string
  customerId: string
  partnerId: string
  finalPrice: number
  completedAt: string
}

export interface PaymentReleasedPayload {
  taskId: string
  partnerId: string
  amount: number
  commission: number
  netAmount: number
  releasedAt: string
  stripeTransferId?: string
}

export interface OfferSentPayload {
  taskId: string
  partnerId: string
  offerId: string
  priceMin: number
  priceMax: number
  estimatedDays: number
  sentAt: string
}

export interface ReviewSubmittedPayload {
  taskId: string
  customerId: string
  partnerId: string
  reviewId: string
  rating: number
  submittedAt: string
}

export interface EscrowRefundedPayload {
  transactionId: string
  partnerId: string
  customerId: string
  reason: string
  refundedAt: string
}

export interface LeadTransitionPayload {
  leadId: string
  fromStatus: string
  toStatus: string
  actor: string
  transitionedAt: string
}

export interface PaymentTransitionPayload {
  transactionId: string
  fromStatus: string
  toStatus: string
  actor: string
  transitionedAt: string
  stripeEventId?: string
}

export interface OnboardingTransitionPayload {
  userId: string
  fromState: string
  toState: string
  blockedReasons: string[]
  transitionedAt: string
}

// Event map — type-safe dispatch
export interface LiftGOEvents {
  'task.created': TaskCreatedPayload
  'task.matched': TaskMatchedPayload
  'task.accepted': TaskAcceptedPayload
  'task.completed': TaskCompletedPayload
  'payment.released': PaymentReleasedPayload
  'offer.sent': OfferSentPayload
  'review.submitted': ReviewSubmittedPayload
  'escrow.refunded': EscrowRefundedPayload
  'lead.transitioned': LeadTransitionPayload
  'payment.transitioned': PaymentTransitionPayload
  'onboarding.transitioned': OnboardingTransitionPayload
}

export type EventName = keyof LiftGOEvents
export type EventPayload<T extends EventName> = LiftGOEvents[T]
