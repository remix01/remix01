import Stripe from 'stripe'
import { getEscrowByPaymentIntent, updateEscrowStatus } from '@/lib/escrow'

export async function handlePaymentFailed(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent

  try {
    const escrow = await getEscrowByPaymentIntent(pi.id)
    await updateEscrowStatus({
      transactionId: escrow.id,
      newStatus: 'cancelled',
      actor: 'system',
      actorId: 'stripe-webhook',
      stripeEventId: event.id,
      metadata: {
        failureCode: pi.last_payment_error?.code,
        failureMessage: pi.last_payment_error?.message,
      },
    })
  } catch {
    console.warn('[WEBHOOK] payment_failed: PI ni v DB', pi.id)
  }
}
