import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditLog, isStripeEventProcessed } from '@/lib/escrow'
import {
  sendPaymentConfirmationToCustomer,
  sendPaymentConfirmationToCraftsman,
  sendPaymentFailedToCustomer,
  sendStripeOnboardingNotification,
} from '@/lib/email'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error('[v0] Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('[v0] Webhook event received:', event.type, 'id:', event.id)

  // ========== IDEMPOTENCY CHECK: Prevent duplicate processing ==========
  const stripeEventId = event.id
  
  // Check if already processed
  const alreadyProcessed = await isStripeEventProcessed(stripeEventId)
  if (alreadyProcessed) {
    console.log(`[v0] Stripe event ${stripeEventId} already processed, skipping`)
    return NextResponse.json({ received: true, skipped: true })
  }

  // Mark as processing BEFORE doing any work (insert sentinel record)
  try {
    await supabaseAdmin.from('escrow_audit_log').insert({
      stripe_event_id: stripeEventId,
      event_type: 'webhook_received',
      actor: 'system',
      metadata: { stripe_event_type: event.type },
    })
  } catch (err: any) {
    // If insert fails due to unique constraint, event is already being processed
    if (err?.code === '23505') { // Unique violation
      console.log(`[v0] Stripe event ${stripeEventId} duplicate detected, aborting`)
      return NextResponse.json({ received: true, duplicate: true })
    }
    // Other errors should not prevent processing
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[v0] Payment succeeded:', paymentIntent.id)

        // Update offer status
        const { data: offer, error: updateError } = await supabase
          .from('offers')
          .update({
            payment_status: 'paid',
            payment_confirmed_at: new Date().toISOString(),
            payment_intent_id: paymentIntent.id,
          })
          .eq('payment_intent_id', paymentIntent.id)
          .select('*, partners(email, full_name)')
          .single()

        if (updateError) {
          console.error('[v0] Error updating offer:', updateError)
          break
        }

        // Record webhook event in audit log
        if (offer) {
          await writeAuditLog({
            transactionId: offer.id,
            eventType: 'paid',
            actor: 'system',
            actorId: 'stripe-webhook',
            stripeEventId: stripeEventId,
            metadata: { payment_intent_id: paymentIntent.id },
          })
        }

        // Send confirmation emails
        if (offer) {
          await sendPaymentConfirmationToCustomer(
            paymentIntent.receipt_email || '',
            offer.partners?.full_name || 'Mojster',
            paymentIntent.amount / 100,
            offer.message || 'Storitev'
          )

          await sendPaymentConfirmationToCraftsman(
            offer.partners?.email || '',
            'Stranka',
            paymentIntent.amount / 100,
            offer.message || 'Storitev'
          )
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[v0] Payment failed:', paymentIntent.id)

        // Update offer status
        await supabase
          .from('offers')
          .update({ payment_status: 'payment_failed' })
          .eq('payment_intent_id', paymentIntent.id)

        // Send notification email to customer
        if (paymentIntent.receipt_email) {
          await sendPaymentFailedToCustomer(
            paymentIntent.receipt_email,
            paymentIntent.amount / 100
          )
        }

        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        console.log('[v0] Account updated:', account.id, 'charges_enabled:', account.charges_enabled)

        // Update partner's Stripe onboarding status
        const { error: partnerError } = await supabase
          .from('partners')
          .update({
            stripe_onboarding_complete: account.charges_enabled || false,
          })
          .eq('stripe_account_id', account.id)

        if (partnerError) {
          console.error('[v0] Error updating partner:', partnerError)
          break
        }

        // Get partner email
        const { data: partner } = await supabase
          .from('partners')
          .select('email')
          .eq('stripe_account_id', account.id)
          .single()

        if (partner) {
          await sendStripeOnboardingNotification(
            partner.email,
            account.charges_enabled || false
          )
        }

        break
      }

      case 'transfer.created': {
        const transfer = event.data.object as Stripe.Transfer
        console.log('[v0] Transfer created:', transfer.id, 'amount:', transfer.amount)

        // Record payout in database
        const { error: payoutError } = await supabase.from('payouts').insert({
          craftsman_id: transfer.metadata.craftsman_id,
          offer_id: transfer.metadata.offer_id,
          amount: transfer.amount / 100,
          stripe_transfer_id: transfer.id,
        })

        if (payoutError) {
          console.error('[v0] Error recording payout:', payoutError)
        }

        break
      }

      default:
        console.log('[v0] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[v0] Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
