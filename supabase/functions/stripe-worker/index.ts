import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

Deno.serve(async (req) => {
  // Auth check
  const auth = req.headers.get('Authorization') ?? ''
  const secret = Deno.env.get('STRIPE_SYNC_WORKER_SECRET') ?? ''

  if (auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Initialize clients INSIDE handler — not at module level
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-06-20',
    httpClient: Stripe.createFetchHttpClient(),
  })

  try {
    // Fetch pending jobs via Supabase REST API (NOT direct postgres)
    const { data: jobs, error: fetchError } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0, pending: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let processed = 0
    let failed = 0

    for (const job of jobs) {
      try {
        // Mark as processing
        await supabase
          .from('job_queue')
          .update({
            status: 'processing',
            attempts: job.attempts + 1,
          })
          .eq('id', job.id)

        // Process by type
        switch (job.type) {
          case 'stripeCapture':
            await stripe.paymentIntents.capture(
              job.payload.paymentIntentId,
              undefined,
              { idempotencyKey: `capture_${job.id}` }
            )
            break

          case 'stripeRelease':
            await stripe.transfers.create(
              {
                amount: Math.round(job.payload.amount * 100),
                currency: 'eur',
                destination: job.payload.stripeAccountId,
                transfer_group: job.payload.escrowId,
              },
              { idempotencyKey: `release_${job.id}` }
            )
            break

          case 'stripeCancel':
            await stripe.paymentIntents.cancel(
              job.payload.paymentIntentId
            )
            break

          case 'stripeRefund':
            await stripe.refunds.create(
              { payment_intent: job.payload.paymentIntentId },
              { idempotencyKey: `refund_${job.id}` }
            )
            break

          default:
            console.warn('[stripe-worker] Unknown job type:', job.type)
        }

        // Mark completed
        await supabase
          .from('job_queue')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            last_error: null,
          })
          .eq('id', job.id)

        processed++

      } catch (jobErr) {
        failed++
        const isFinal = job.attempts >= 2
        await supabase
          .from('job_queue')
          .update({
            status: isFinal ? 'failed' : 'pending',
            last_error: String(jobErr),
          })
          .eq('id', job.id)

        console.error(`[stripe-worker] Job ${job.id} (${job.type}) failed:`, jobErr)
      }
    }

    return new Response(
      JSON.stringify({ processed, failed, total: jobs.length }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[stripe-worker] Fatal:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
