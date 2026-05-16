import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { assertLegacyWriteAllowed } from '@/lib/db/legacy-write-guard'
import { createClient } from '@/lib/supabase/server'
import { withIdempotency } from '@/lib/idempotency/withIdempotency'

const confirmCompletionSchema = z.object({
  jobId: z.string().cuid(),
})

async function handler(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request
    const body = await request.json()
    const validation = confirmCompletionSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
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
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.customer_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this job' }, { status: 403 })
    }

    // 5. Validate job status
    if (job.status !== 'IN_PROGRESS' && job.status !== 'AWAITING_CONFIRMATION') {
      return NextResponse.json(
        { error: 'Job must be IN_PROGRESS or AWAITING_CONFIRMATION', currentStatus: job.status },
        { status: 400 }
      )
    }

    // 6. Validate payment exists and is held in escrow
    if (!job.payment) {
      return NextResponse.json({ error: 'No payment found for this job' }, { status: 400 })
    }

    if (job.payment.status !== 'HELD') {
      return NextResponse.json(
        { error: 'Payment is not in HELD status', currentStatus: job.payment.status },
        { status: 400 }
      )
    }

    // 7. Validate craftworker has Stripe account
    if (!job.craftworker?.craftworker_profile?.stripe_account_id) {
      return NextResponse.json(
        { error: 'Craftworker does not have Stripe account configured' },
        { status: 400 }
      )
    }

    const stripeAccountId = job.craftworker.craftworker_profile.stripe_account_id
    const craftworkerPayoutAmount = Number(job.payment.craftworker_payout)

    // 8. Update job status to COMPLETED
    const { error: jobUpdateError } = await supabaseAdmin
      .from((assertLegacyWriteAllowed('job', 'app/api/payments/confirm-completion/route.ts'), 'job'))
      .update({
        status: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    if (jobUpdateError) throw new Error(jobUpdateError.message)

    // 9. Update payment status to RELEASED
    const { error: paymentUpdateError } = await supabaseAdmin
      .from((assertLegacyWriteAllowed('payment', 'app/api/payments/confirm-completion/route.ts'), 'payment'))
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
        .from((assertLegacyWriteAllowed('craftworker_profile', 'app/api/payments/confirm-completion/route.ts'), 'craftworker_profile'))
        .update({
          total_jobs_completed: (profile.total_jobs_completed || 0) + 1,
        })
        .eq('user_id', job.craftworker_id)
    }

    // 11. Create Stripe payout (happens automatically with destination charges, but we log it)
    // Note: With destination charges and application fees, the money is already in the connected account
    // We don't need to create a separate transfer - it was created when the PaymentIntent succeeded

    // 12. Notify craftworker of completion and incoming payout
    const craftsmanEmail = job.craftworker?.email as string | undefined
    if (craftsmanEmail) {
      const { getResendClient, getDefaultFrom, resolveEmailRecipients } = await import('@/lib/resend')
      const resend = getResendClient()
      if (resend) {
        const { to: resolvedTo } = resolveEmailRecipients(craftsmanEmail)
        await resend.emails.send({
          from: getDefaultFrom(),
          to: resolvedTo,
          subject: '✅ Naročilo zaključeno — plačilo je na poti',
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
              <h2 style="color:#0d9488;">Čestitamo — naročilo je zaključeno!</h2>
              <p>Pozdravljeni ${job.craftworker?.name ?? ''},</p>
              <p>Kupec je potrdil zaključek naročila. Vaše plačilo je na poti.</p>
              <table style="width:100%;border-collapse:collapse;margin:16px 0;">
                <tr><td style="padding:8px;color:#64748b;width:40%;">Job ID:</td><td style="padding:8px;"><strong>${jobId}</strong></td></tr>
                <tr><td style="padding:8px;color:#64748b;">Vaše plačilo:</td><td style="padding:8px;"><strong>${craftworkerPayoutAmount} EUR</strong></td></tr>
                <tr><td style="padding:8px;color:#64748b;">Status:</td><td style="padding:8px;">Sproščeno na vaš Stripe račun</td></tr>
              </table>
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
              <p style="color:#94a3b8;font-size:12px;">LiftGO — <a href="${process.env.NEXT_PUBLIC_APP_URL}/obrtnik/dashboard" style="color:#0d9488;">Odpri dashboard</a></p>
            </div>
          `,
        }).catch(err => console.error('[confirm-completion] Craftworker email failed:', err))
      }
    }
    console.log(`[confirm-completion] Job ${jobId} completed. Craftworker ${job.craftworker_id} will receive ${craftworkerPayoutAmount} EUR`)

    return NextResponse.json({
      success: true,
      jobId: job.id,
      paymentStatus: 'RELEASED',
      completedAt: new Date().toISOString(),
      message: 'Payment released to craftworker successfully',
    })

  } catch (error) {
    console.error('[confirm-completion] Error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm job completion', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export const POST = withIdempotency(handler)
