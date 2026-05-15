import type { EscrowStatus } from '@/lib/escrow'

export type PaymentEventKind = 'payment_succeeded' | 'payment_failed' | 'charge_refunded' | 'transfer_created' | 'dispute_opened'

const EVENT_TO_STATUS: Record<PaymentEventKind, EscrowStatus> = {
  payment_succeeded: 'paid',
  payment_failed: 'cancelled',
  charge_refunded: 'refunded',
  transfer_created: 'released',
  dispute_opened: 'disputed',
}

const ALLOWED_ESCROW_TRANSITIONS: Record<EscrowStatus, EscrowStatus[]> = {
  pending: ['paid', 'cancelled'],
  paid: ['released', 'refunded', 'disputed', 'releasing'],
  released: [],
  refunded: [],
  disputed: ['released', 'refunded', 'resolving'],
  cancelled: [],
  releasing: ['paid', 'released'],
  resolving: ['disputed', 'released', 'refunded'],
}

export function targetStatusForEvent(kind: PaymentEventKind): EscrowStatus {
  return EVENT_TO_STATUS[kind]
}

export function shouldSkipEventForCurrentStatus(currentStatus: EscrowStatus, nextStatus: EscrowStatus): boolean {
  if (currentStatus === nextStatus) return true

  const allowedNext = ALLOWED_ESCROW_TRANSITIONS[currentStatus] ?? []
  if (!allowedNext.includes(nextStatus)) return true

  return false
}

export function stripeCorrelation(event: { id: string; type: string }, paymentId?: string) {
  return {
    correlationId: `${event.id}:${paymentId ?? 'unknown'}`,
    paymentId: paymentId ?? null,
    stripeEventId: event.id,
    stripeEventType: event.type,
  }
}
