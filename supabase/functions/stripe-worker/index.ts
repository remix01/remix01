import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
  const auth = req.headers.get('Authorization')
  const expected = 'Bearer ' + Deno.env.get('STRIPE_SYNC_WORKER_SECRET')

  if (auth !== expected) {
    return new Response('Unauthorized', { status: 401 })
  }

  try {
    const { data: jobs, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw error

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let processed = 0

    for (const job of jobs) {
      try {
        await supabase
          .from('job_queue')
          .update({ status: 'processing', attempts: job.attempts + 1 })
          .eq('id', job.id)

        switch (job.type) {
          case 'stripeCapture':
            await stripe.paymentIntents.capture(
              job.payload.paymentIntentId,
              undefined,
              { idempotencyKey: job.id }
            )
            break
          case 'stripeRelease':
            await stripe.transfers.create(
              {
                amount: job.payload.amount,
                currency: 'eur',
                destination: job.payload.stripeAccountId,
              },
              { idempotencyKey: job.id }
            )
            break
          case 'stripeCancel':
            await stripe.paymentIntents.cancel(job.payload.paymentIntentId)
            break
          case 'stripeRefund':
            await stripe.refunds.create(
              { payment_intent: job.payload.paymentIntentId },
              { idempotencyKey: job.id }
            )
            break
          default:
            console.log('[stripe-worker] Unknown type:', job.type)
        }

        await supabase
          .from('job_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', job.id)

        processed++

      } catch (jobError) {
        await supabase
          .from('job_queue')
          .update({
            status: job.attempts >= 2 ? 'failed' : 'pending',
            last_error: String(jobError),
          })
          .eq('id', job.id)
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
