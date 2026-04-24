import { NextRequest } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

const confirmCompletionSchema = z.object({
  jobId: z.string().cuid(),
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return fail('Unauthorized', 401)
    }

    // 2. Parse and validate request
    const body = await request.json()
    const validation = confirmCompletionSchema.safeParse(body)
    
    if (!validation.success) {
      return fail('Invalid request data', 400, { details: validation.error.errors })
    }

    const { jobId } = validation.data

    // 3. Fetch job with payment and craftworker info
    const { data: job, error: jobError } = await supabaseAdmin
      .from('job')
      .select(`
        *,
        payment:payment_id(*),
        craftworker:craftworker_id(
          *,
          craftworker_profile(*)
        )
      `)
      .eq('id', jobId)
      .single()

    // 4. Validate job exists and user is the customer
    if (jobError || !job) {
      return fail('Job not found', 404)
    }

    if (job.customer_id !== user.id) {
      return fail('Not authorized for this job', 403)
    }

    // 5. Validate job status
    if (job.status !== 'IN_PROGRESS' && job.status !== 'AWAITING_CONFIRMATION') {
      return fail('Job must be IN_PROGRESS or AWAITING_CONFIRMATION', 400, { currentStatus: job.status })
    }

    // 6. Validate payment exists and is held in escrow
    if (!job.payment) {
      return fail('No payment found for this job', 400)
    }

    if (job.payment.status !== 'HELD') {
      return fail('Payment is not in HELD status', 400, { currentStatus: job.payment.status })
    }

    // 7. Validate craftworker has Stripe account
    if (!job.craftworker?.craftworker_profile?.stripe_account_id) {
      return fail('Craftworker does not have Stripe account configured', 400)
    }

    const stripeAccountId = job.craftworker.craftworker_profile.stripe_account_id
    const craftworkerPayoutAmount = Number(job.payment.craftworker_payout)

    // 8. Update job status to COMPLETED
    const { error: jobUpdateError } = await supabaseAdmin
      .from('job')
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (jobUpdateError) throw new Error(jobUpdateError.message)

    // 9. Update payment status to RELEASED
    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payment')
      .update({
        status: 'RELEASED',
        released_at: new Date().toISOString(),
      })
      .eq('id', job.payment.id)

    if (paymentUpdateError) throw new Error(paymentUpdateError.message)

    // 10. Update craftworker profile metrics
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('craftworker_profile')
      .select('total_jobs_completed')
      .eq('user_id', job.craftworker_id)
      .single()

    if (!profileError && profile) {
      await supabaseAdmin
        .from('craftworker_profile')
        .update({
          total_jobs_completed: (profile.total_jobs_completed || 0) + 1,
        })
        .eq('user_id', job.craftworker_id)
    }

    // 11. Create Stripe payout (happens automatically with destination charges, but we log it)
    // Note: With destination charges and application fees, the money is already in the connected account
    // We don't need to create a separate transfer - it was created when the PaymentIntent succeeded
    
    // TODO: Send email/SMS notification to craftworker
    console.log(`[confirm-completion] Job ${jobId} completed. Craftworker ${job.craftworker_id} will receive ${craftworkerPayoutAmount} EUR`)

    return ok({
      success: true,
      jobId: job.id,
      paymentStatus: 'RELEASED',
      completedAt: new Date().toISOString(),
      message: 'Payment released to craftworker successfully',
    })

  } catch (error) {
    console.error('[confirm-completion] Error:', error)
    return fail('Failed to confirm job completion', 500, { message: error instanceof Error ? error.message : 'Unknown error' })
  }
}
