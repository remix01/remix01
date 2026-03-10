/**
 * Event Type Definitions — Type-safe event payload contracts
 * 
 * Each event has a strongly-typed payload structure.
 * Used by eventBus.emit<T>() and subscribers for type safety.
 */

export interface TaskCreatedPayload {
  taskId: string
  customerId: string
  categoryId: string
  lat: number
  lng: number
  description: string
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
  completedAt: string
  finalPrice: number
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
  comment: string
  submittedAt: string
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
}

export type EventName = keyof LiftGOEvents
export type EventPayload<T extends EventName> = LiftGOEvents[T]
