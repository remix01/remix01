import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { transferToObrtnik } from '@/lib/mcp/payments'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20'
})

// Disable body parsing for webhook verification
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    )
  }

  let event: Stripe.Event

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    console.error('[Webhook] Signature verification failed:', error)
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    )
  }

  // Initialize Supabase with service role key for admin operations
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  try {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[Webhook] Payment succeeded:', paymentIntent.id)

        const ponudbaId = paymentIntent.metadata.ponudba_id
        const povprasevanjeId = paymentIntent.metadata.povprasevanje_id

        if (!ponudbaId || !povprasevanjeId) {
          console.error('[Webhook] Missing metadata:', paymentIntent.metadata)
          break
        }

        // 1. Update ponudba status to 'placano' and save payment details
        const { error: ponudbaError } = await supabase
          .from('ponudbe')
          .update({
            payment_status: 'paid',
            stripe_payment_intent_id: paymentIntent.id,
          })
          .eq('id', ponudbaId)

        if (ponudbaError) {
          console.error('[Webhook] Failed to update ponudba:', ponudbaError)
        }

        // 2. Update povprasevanje status to 'zakljuceno'
        const { error: povprasevanjeError } = await supabase
          .from('povprasevanja')
          .update({ status: 'zakljuceno' })
          .eq('id', povprasevanjeId)

        if (povprasevanjeError) {
          console.error('[Webhook] Failed to update povprasevanje:', povprasevanjeError)
        }

        // 3. Get obrtnik's Stripe account ID from ponudba
        const { data: ponudba } = await supabase
          .from('ponudbe')
          .select(`
            obrtnik_id,
            obrtnik_profiles:obrtnik_id (
              stripe_account_id,
              stripe_onboarded
            )
          `)
          .eq('id', ponudbaId)
          .single()

        if (ponudba?.obrtnik_profiles?.stripe_account_id && 
            ponudba?.obrtnik_profiles?.stripe_onboarded) {
          // 4. Transfer payment to obrtnik
          const { transferId, error: transferError } = await transferToObrtnik({
            amount: paymentIntent.amount,
            stripeAccountId: ponudba.obrtnik_profiles.stripe_account_id,
            ponudbaId: ponudbaId,
          })

          if (transferError) {
            console.error('[Webhook] Transfer failed:', transferError)
            
            // Create notification for admin about failed transfer
            await supabase.from('notifications').insert({
              user_id: ponudba.obrtnik_id,
              type: 'payment_failed',
              title: 'Prenos plačila ni uspel',
              message: `Prenos plačila za ponudbo ${ponudbaId} ni uspel. Kontaktirajte podporo.`,
              read: false,
            })
          } else {
            console.log('[Webhook] Transfer successful:', transferId)
            
            // Notify obrtnik of successful payout
            await supabase.from('notifications').insert({
              user_id: ponudba.obrtnik_id,
              type: 'payment_received',
              title: 'Plačilo prejeto',
              message: `Prejeli ste plačilo za ponudbo ${ponudbaId}. Preverite svoj Stripe račun.`,
              read: false,
            })
          }
        } else {
          console.warn('[Webhook] Obrtnik not onboarded to Stripe, payment held')
        }

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.log('[Webhook] Payment failed:', paymentIntent.id)

        const ponudbaId = paymentIntent.metadata.ponudba_id
        const povprasevanjeId = paymentIntent.metadata.povprasevanje_id

        if (!ponudbaId) break

        // Update ponudba payment status
        await supabase
          .from('ponudbe')
          .update({ payment_status: 'failed' })
          .eq('id', ponudbaId)

        // Get narocnik_id from povprasevanje
        const { data: povprasevanje } = await supabase
          .from('povprasevanja')
          .select('narocnik_id')
          .eq('id', povprasevanjeId)
          .single()

        if (povprasevanje) {
          // Notify naročnik of payment failure
          await supabase.from('notifications').insert({
            user_id: povprasevanje.narocnik_id,
            type: 'payment_failed',
            title: 'Plačilo ni uspelo',
            message: `Plačilo za ponudbo ni bilo uspešno. Prosimo poskusite znova.`,
            read: false,
          })
        }

        break
      }

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        console.log('[Webhook] Account updated:', account.id)

        // Update obrtnik_profiles when Stripe account is fully onboarded
        if (account.charges_enabled && account.payouts_enabled) {
          await supabase
            .from('obrtnik_profiles')
            .update({ stripe_onboarded: true })
            .eq('stripe_account_id', account.id)
        }

        break
      }

      default:
        console.log('[Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Error processing event:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}
