import Stripe from 'stripe'
import { handleCheckoutCompleted } from './checkoutCompleted'
import { handlePaymentSucceeded } from './paymentSucceeded'
import { handlePaymentFailed } from './paymentFailed'
import { handleSubscriptionUpdated } from './subscriptionUpdated'
import { handleConnectAccount } from './connectAccount'
import { handleInvoicePaymentFailed, handleInvoicePaymentSucceeded } from './invoiceEvents'
import { applyStripePaymentEvent } from '@/lib/services/paymentStateService'

export type StripeWebhookHandler = (event: Stripe.Event) => Promise<void>

function isTransientSkip(reason?: string, currentStatus?: string): boolean {
  if (reason === 'missing_local_payment') return true
  if (reason === 'state_guard_skip' && currentStatus === 'pending') return true
  return false
}

async function handleTransferCreated(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer
  const piId = transfer.metadata?.payment_intent_id
  if (!piId) return

  const { applied, reason, currentStatus } = await applyStripePaymentEvent({
    stripeEvent: event,
    paymentIntentId: piId,
    eventKind: 'transfer_created',
    extraFields: { stripe_transfer_id: transfer.id },
    metadata: { transferId: transfer.id, transferAmount: transfer.amount },
  })

  if (!applied && isTransientSkip(reason, currentStatus)) {
    throw new Error(
      `[WEBHOOK] transfer.created out-of-order for ${piId} (${reason}, status=${currentStatus ?? 'none'}), needs Stripe retry`
    )
  }
}

async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id

  if (!piId) return

  const { applied, reason, currentStatus } = await applyStripePaymentEvent({
    stripeEvent: event,
    paymentIntentId: piId,
    eventKind: 'charge_refunded',
    extraFields: { refunded_at: new Date().toISOString() },
    metadata: { refundAmount: charge.amount_refunded },
  })

  if (!applied && isTransientSkip(reason, currentStatus)) {
    throw new Error(
      `[WEBHOOK] charge.refunded out-of-order for ${piId} (${reason}, status=${currentStatus ?? 'none'}), needs Stripe retry`
    )
  }
}

export const stripeWebhookHandlers: Record<string, StripeWebhookHandler> = {
  'checkout.session.completed': handleCheckoutCompleted,
  'payment_intent.succeeded': handlePaymentSucceeded,
  'payment_intent.payment_failed': handlePaymentFailed,
  'customer.subscription.updated': handleSubscriptionUpdated,
  'customer.subscription.created': handleSubscriptionUpdated,
  'customer.subscription.deleted': handleSubscriptionUpdated,
  'invoice.payment_succeeded': handleInvoicePaymentSucceeded,
  'invoice.payment_failed': handleInvoicePaymentFailed,
  'transfer.created': handleTransferCreated,
  'charge.refunded': handleChargeRefunded,
  'v2.core.account[requirements].updated': handleConnectAccount,
  'v2.core.account[identity].updated': handleConnectAccount,
  'v2.core.account[configuration.merchant].capability_status_updated': handleConnectAccount,
  'v2.core.account_person.created': handleConnectAccount,
  'v2.core.account_person.updated': handleConnectAccount,
}
