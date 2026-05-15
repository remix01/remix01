import Stripe from 'stripe'
import { subscriptionService } from '@/lib/services/subscription.service'

export async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const invoiceAny = invoice as any
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
  const subscriptionId = typeof invoiceAny.subscription === 'string' ? invoiceAny.subscription : null
  if (!customerId) {
    throw new Error('[WEBHOOK] invoice.payment_succeeded missing customer ID')
  }

  const rawPrice = invoice.lines.data[0]?.pricing?.price_details?.price
  const priceId = typeof rawPrice === 'string' ? rawPrice : rawPrice?.id ?? ''
  const tier = subscriptionService.tierFromPriceId(priceId)
  await subscriptionService.updateSubscription(null, customerId, tier, subscriptionId ?? undefined)
}

export async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const invoiceAny = invoice as any
  const customerId = typeof invoice.customer === 'string' ? invoice.customer : null
  const subscriptionId = typeof invoiceAny.subscription === 'string' ? invoiceAny.subscription : null
  if (!customerId) {
    throw new Error('[WEBHOOK] invoice.payment_failed missing customer ID')
  }

  // Fail-closed policy: downgrade to START when invoice payment repeatedly fails or subscription turns past_due.
  await subscriptionService.updateSubscription(null, customerId, 'start', subscriptionId ?? undefined)
}
