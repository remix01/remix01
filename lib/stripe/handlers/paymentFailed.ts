import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enqueue } from '@/lib/jobs/queue'
import { applyStripePaymentEvent } from '@/lib/services/paymentStateService'

export async function handlePaymentFailed(event: Stripe.Event) {
  const pi = event.data.object as Stripe.PaymentIntent

  await applyStripePaymentEvent({
    stripeEvent: event,
    paymentIntentId: pi.id,
    eventKind: 'payment_failed',
    metadata: {
      failureCode: pi.last_payment_error?.code,
      failureMessage: pi.last_payment_error?.message,
    },
  })

  // Send payment failure email
  try {
    const userId = pi.metadata?.user_id || pi.metadata?.obrtnik_id
    let recipientEmail: string | null = null
    let recipientName = ''

    if (userId) {
      const { data: profile } = await supabaseAdmin
        .from('obrtnik_profiles')
        .select('email, ime, priimek')
        .eq('user_id', userId)
        .maybeSingle()
      recipientEmail = profile?.email ?? null
      recipientName = profile ? `${profile.ime ?? ''} ${profile.priimek ?? ''}`.trim() : ''
    }

    if (recipientEmail) {
      await enqueue('sendEmail', {
        to: recipientEmail,
        template: 'payment_failed',
        customData: {
          recipientName,
          failureReason: pi.last_payment_error?.message ?? 'Plačilo ni bilo uspešno.',
        },
      })
    }
  } catch (err) {
    console.error('[WEBHOOK] payment_intent.payment_failed: email failed', err)
  }
}
