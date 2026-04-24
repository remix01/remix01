import { NextRequest } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { ok, fail } from '@/lib/http/response'

const disputeSchema = z.object({
  jobId: z.string().cuid(),
  reason: z.string().min(10).max(1000),
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
    const validation = disputeSchema.safeParse(body)
    
    if (!validation.success) {
      return fail('Invalid request data', 400, { details: validation.error.errors })
    }

    const { jobId, reason } = validation.data

    // 3. Fetch job with payment info
    const { data: job, error: jobError } = await supabaseAdmin
      .from('job')
      .select(`
        *,
        payment:payment_id(*),
        customer:customer_id(*),
        craftworker:craftworker_id(*)
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

    // 5. Validate payment exists
    if (!job.payment) {
      return fail('No payment found for this job', 400)
    }

    // 6. Can only dispute if payment is HELD or RELEASED (within dispute window)
    if (job.payment.status !== 'HELD' && job.payment.status !== 'RELEASED') {
      return fail('Payment cannot be disputed in current status', 400, { currentStatus: job.payment.status })
    }

    // 7. Update job and payment status to DISPUTED
    const { error: jobUpdateError } = await supabaseAdmin
      .from('job')
      .update({ status: 'DISPUTED' })
      .eq('id', jobId)

    const { error: paymentUpdateError } = await supabaseAdmin
      .from('payment')
      .update({
        status: 'DISPUTED',
        dispute_reason: reason,
      })
      .eq('id', job.payment.id)

    if (jobUpdateError || paymentUpdateError) {
      throw new Error('Database update failed')
    }

    // 8. Send alert email to admin
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@liftgo.net'
    
    // TODO: Implement actual email sending
    console.log(`[dispute] ADMIN ALERT - Dispute opened for job ${jobId}`)
    console.log(`Customer: ${job.customer.name} (${job.customer.email})`)
    console.log(`Craftworker: ${job.craftworker?.name} (${job.craftworker?.email})`)
    console.log(`Reason: ${reason}`)
    console.log(`Amount: ${job.payment.amount} EUR`)
    console.log(`Send notification to: ${adminEmail}`)

    // Note: Transfer is frozen - no payout will be made until dispute is resolved
    // Admin must manually review and either:
    // 1. Release payment to craftworker (set status to RELEASED)
    // 2. Refund customer (set status to REFUNDED and create Stripe refund)

    return ok({
      success: true,
      jobId: job.id,
      jobStatus: 'DISPUTED',
      paymentStatus: 'DISPUTED',
      message: 'Dispute opened successfully. Admin team will review within 24-48 hours.',
    })

  } catch (error) {
    console.error('[dispute] Error:', error)
    return fail('Failed to open dispute', 500, { message: error instanceof Error ? error.message : 'Unknown error' })
  }
}
