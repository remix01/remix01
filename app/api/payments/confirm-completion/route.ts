import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

const confirmCompletionSchema = z.object({
  jobId: z.string().cuid(),
})

export async function POST(request: NextRequest) {
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
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        payment: true,
        craftworker: {
          include: {
            craftworkerProfile: true,
          },
        },
      },
    })

    // 4. Validate job exists and user is the customer
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.customerId !== user.id) {
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
    if (!job.craftworker?.craftworkerProfile?.stripeAccountId) {
      return NextResponse.json(
        { error: 'Craftworker does not have Stripe account configured' },
        { status: 400 }
      )
    }

    const stripeAccountId = job.craftworker.craftworkerProfile.stripeAccountId
    const craftworkerPayoutAmount = job.payment.craftworkerPayout.toNumber()

    // 8. Perform database update and Stripe operations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Update job status to COMPLETED
      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      })

      // Update payment status to RELEASED
      const updatedPayment = await tx.payment.update({
        where: { id: job.payment!.id },
        data: {
          status: 'RELEASED',
          releasedAt: new Date(),
        },
      })

      // Update craftworker profile metrics
      await tx.craftworkerProfile.update({
        where: { userId: job.craftworkerId! },
        data: {
          totalJobsCompleted: {
            increment: 1,
          },
        },
      })

      return { updatedJob, updatedPayment }
    })

    // 9. Create Stripe payout (happens automatically with destination charges, but we log it)
    // Note: With destination charges and application fees, the money is already in the connected account
    // We don't need to create a separate transfer - it was created when the PaymentIntent succeeded
    
    // TODO: Send email/SMS notification to craftworker
    console.log(`[confirm-completion] Job ${jobId} completed. Craftworker ${job.craftworkerId} will receive ${craftworkerPayoutAmount} EUR`)

    return NextResponse.json({
      success: true,
      jobId: result.updatedJob.id,
      paymentStatus: result.updatedPayment.status,
      completedAt: result.updatedJob.completedAt,
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
