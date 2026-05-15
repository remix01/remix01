import { getEscrowByPaymentIntent, updateEscrowStatus, type EscrowStatus } from '@/lib/escrow'
import { shouldSkipEventForCurrentStatus, stripeCorrelation, targetStatusForEvent, type PaymentEventKind } from '@/lib/state-machine/paymentStatus'

export async function applyStripePaymentEvent(params: {
  stripeEvent: { id: string; type: string }
  paymentIntentId: string
  eventKind: PaymentEventKind
  metadata?: Record<string, unknown>
  extraFields?: Record<string, unknown>
}): Promise<{ applied: boolean; reason?: string; paymentId?: string }> {
  const { stripeEvent, paymentIntentId, eventKind, metadata, extraFields } = params
  const escrow = await getEscrowByPaymentIntent(paymentIntentId)

  if (!escrow) {
    console.info('[PAYMENT_STATE] Stripe event without local payment', stripeCorrelation(stripeEvent))
    return { applied: false, reason: 'missing_local_payment' }
  }

  const currentStatus = escrow.status as EscrowStatus
  const nextStatus = targetStatusForEvent(eventKind)
  const logCtx = stripeCorrelation(stripeEvent, escrow.id)

  if (shouldSkipEventForCurrentStatus(currentStatus, nextStatus)) {
    console.info('[PAYMENT_STATE] Event skipped by state machine guard', { ...logCtx, currentStatus, nextStatus })
    return { applied: false, reason: 'state_guard_skip', paymentId: escrow.id }
  }

  await updateEscrowStatus({
    transactionId: escrow.id,
    newStatus: nextStatus,
    actor: 'system',
    actorId: 'stripe-webhook',
    stripeEventId: stripeEvent.id,
    extraFields,
    metadata,
  })

  console.info('[PAYMENT_STATE] Transition applied', { ...logCtx, currentStatus, nextStatus })
  return { applied: true, paymentId: escrow.id }
}
