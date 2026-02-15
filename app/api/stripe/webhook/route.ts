import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
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

  console.log('[v0] Webhook event received:', event.type)

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
