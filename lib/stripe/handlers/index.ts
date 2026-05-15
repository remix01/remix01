import Stripe from 'stripe'
import { handleCheckoutCompleted } from './checkoutCompleted'
import { handlePaymentSucceeded } from './paymentSucceeded'
import { handlePaymentFailed } from './paymentFailed'
import { handleSubscriptionUpdated } from './subscriptionUpdated'
import { handleConnectAccount } from './connectAccount'
import { handleInvoicePaymentFailed, handleInvoicePaymentSucceeded } from './invoiceEvents'
import { getEscrowByPaymentIntent, updateEscrowStatus, writeAuditLog } from '@/lib/escrow'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type StripeWebhookHandler = (event: Stripe.Event) => Promise<void>

async function handleTransferCreated(event: Stripe.Event) {
  const transfer = event.data.object as Stripe.Transfer
  const piId = transfer.metadata?.payment_intent_id
  if (!piId) return

  const escrow = await getEscrowByPaymentIntent(piId)
  const { error } = await supabaseAdmin
    .from('escrow_transactions')
    .update({ stripe_transfer_id: transfer.id })
    .eq('id', escrow.id)

  if (!error) {
    await writeAuditLog({
      transactionId: escrow.id,
      eventType: 'released',
      actor: 'system',
      actorId: 'stripe-webhook',
      stripeEventId: event.id,
      statusBefore: 'paid',
      statusAfter: 'released',
      amountCents: transfer.amount,
      metadata: { transferId: transfer.id },
    })
  }
}

async function handleChargeRefunded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge
  const piId = typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id

  if (!piId) return

  try {
    const escrow = await getEscrowByPaymentIntent(piId)
    await updateEscrowStatus({
      transactionId: escrow.id,
      newStatus: 'refunded',
      actor: 'system',
      actorId: 'stripe-webhook',
      stripeEventId: event.id,
      extraFields: { refunded_at: new Date().toISOString() },
      metadata: { refundAmount: charge.amount_refunded },
    })
  } catch {
    console.warn('[WEBHOOK] charge.refunded: ni v DB', piId)
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
