import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/mcp/payments'
import { transferToObrtnik } from '@/lib/mcp/payments'
import { createClient } from '@/lib/supabase/server'

export const config = {
  api: { bodyParser: false },
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error(`[webhook] Webhook signature verification failed: ${errorMessage}`)
    return NextResponse.json(
      { error: `Webhook Error: ${errorMessage}` },
      { status: 400 }
    )
  }

  const supabase = await createClient()

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object, supabase)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object, supabase)
        break

      default:
        console.log(`[webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error(`[webhook] Error processing event: ${errorMessage}`)
    return NextResponse.json(
      { error: `Error processing event: ${errorMessage}` },
      { status: 500 }
    )
  }
}

async function handlePaymentSucceeded(paymentIntent: any, supabase: any) {
  const ponudbaId = paymentIntent.metadata.ponudba_id
  const amount = paymentIntent.amount

  console.log(`[webhook] Payment succeeded for ponudba ${ponudbaId}`)

  // Update ponudba status to 'placano'
  await supabase
    .from('ponudbe')
    .update({
      payment_status: 'paid',
      status: 'placano',
    })
    .eq('id', ponudbaId)

  // Get ponudba details for povprasevanje update
  const { data: ponudba } = await supabase
    .from('ponudbe')
    .select('povprasevanje_id, obrtnik_id')
    .eq('id', ponudbaId)
    .single()

  if (ponudba) {
    // Update povprasevanje status to 'zakljuceno'
    await supabase
      .from('povprasevanja')
      .update({ status: 'zakljuceno' })
      .eq('id', ponudba.povprasevanje_id)

    // Get obrtnik stripe account
    const { data: obrtnik } = await supabase
      .from('obrtnik_profiles')
      .select('stripe_account_id')
      .eq('id', ponudba.obrtnik_id)
      .single()

    if (obrtnik?.stripe_account_id) {
      // Trigger transfer to obrtnik
      const result = await transferToObrtnik({
        amount,
        stripeAccountId: obrtnik.stripe_account_id,
        ponudbaId,
      })

      if (result.error) {
        console.error(`[webhook] Transfer failed: ${result.error}`)
      } else {
        console.log(`[webhook] Transfer completed: ${result.transferId}`)
      }
    }
  }
}

async function handlePaymentFailed(paymentIntent: any, supabase: any) {
  const ponudbaId = paymentIntent.metadata.ponudba_id

  console.log(`[webhook] Payment failed for ponudba ${ponudbaId}`)

  // Update ponudba status to 'failed'
  await supabase
    .from('ponudbe')
    .update({ payment_status: 'failed' })
    .eq('id', ponudbaId)

  // Optionally notify narocnik by inserting a notification
  // This would depend on your notification system
}
