import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import type Stripe from 'stripe'

// Disable body parsing for webhook signature verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  
  if (!signature) {
    console.error('[webhook] Missing Stripe signature')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  
  if (!webhookSecret) {
    console.error('[webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    // Get raw body for signature verification
    const body = await request.text()
    
    // Construct and verify event
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    
    console.log(`[webhook] Received event: ${event.type}`)
  } catch (error) {
    console.error('[webhook] Signature verification failed:', error)
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Return 200 immediately - process events asynchronously
  // This prevents Stripe from retrying if processing takes > 5 seconds
  const responsePromise = handleEvent(event)
  
  // Don't await - let it run in background
  responsePromise.catch(error => {
    console.error('[webhook] Event processing error:', error)
  })

  return NextResponse.json({ received: true, eventId: event.id })
}

async function handleEvent(event: Stripe.Event) {
  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent)
        break

      case 'account.updated':
        await handleAccountUpdated(event.data.object as Stripe.Account)
        break

      case 'transfer.created':
        await handleTransferCreated(event.data.object as Stripe.Transfer)
        break

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object as Stripe.Charge)
        break

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }
  } catch (error) {
    console.error(`[webhook] Error handling ${event.type}:`, error)
    throw error
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[webhook] PaymentIntent succeeded: ${paymentIntent.id}`)
  
  const jobId = paymentIntent.metadata.jobId
  
  if (!jobId) {
    console.error('[webhook] Missing jobId in payment intent metadata')
    return
  }

  await prisma.$transaction(async (tx) => {
    // Update payment status to HELD
    const payment = await tx.payment.update({
      where: { stripePaymentIntentId: paymentIntent.id },
      data: {
        status: 'HELD',
        heldAt: new Date(),
      },
    })

    // Update job status to IN_PROGRESS
    await tx.job.update({
      where: { id: jobId },
      data: {
        status: 'IN_PROGRESS',
      },
    })

    console.log(`[webhook] Job ${jobId} set to IN_PROGRESS, payment ${payment.id} held in escrow`)
  })
}

async function handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
  console.log(`[webhook] PaymentIntent failed: ${paymentIntent.id}`)
  
  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntent.id },
  })

  if (!payment) {
    console.error(`[webhook] Payment not found for intent ${paymentIntent.id}`)
    return
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'UNPAID',
    },
  })

  // TODO: Send email notification to customer about failed payment
  console.log(`[webhook] Payment ${payment.id} marked as UNPAID - customer needs to retry`)
}

async function handleAccountUpdated(account: Stripe.Account) {
  console.log(`[webhook] Account updated: ${account.id}`)
  
  const isOnboardingComplete = account.details_submitted && 
    account.charges_enabled && 
    account.payouts_enabled

  await prisma.craftworkerProfile.update({
    where: { stripeAccountId: account.id },
    data: {
      stripeOnboardingComplete: isOnboardingComplete,
    },
  })

  console.log(`[webhook] Updated onboarding status for ${account.id}: ${isOnboardingComplete}`)
}

async function handleTransferCreated(transfer: Stripe.Transfer) {
  console.log(`[webhook] Transfer created: ${transfer.id}`)
  console.log(`Amount: ${transfer.amount / 100} ${transfer.currency.toUpperCase()}`)
  console.log(`Destination: ${transfer.destination}`)
  console.log(`Transfer group: ${transfer.transfer_group}`)
  
  // Log transfer for auditing purposes
  // Could store in a separate transfers table if needed
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  console.log(`[webhook] Charge refunded: ${charge.id}`)
  
  const paymentIntentId = typeof charge.payment_intent === 'string' 
    ? charge.payment_intent 
    : charge.payment_intent?.id

  if (!paymentIntentId) {
    console.error('[webhook] Missing payment intent in charge')
    return
  }

  const payment = await prisma.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
  })

  if (!payment) {
    console.error(`[webhook] Payment not found for charge ${charge.id}`)
    return
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'REFUNDED',
      refundedAt: new Date(),
    },
  })

  console.log(`[webhook] Payment ${payment.id} marked as REFUNDED`)
}
