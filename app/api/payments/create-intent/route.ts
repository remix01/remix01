import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

const createIntentSchema = z.object({
  jobId: z.string().cuid(),
  amount: z.number().positive().max(100000), // Max 100k EUR
})

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request body
    const body = await request.json()
    const validation = createIntentSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { jobId, amount } = validation.data

    // 3. Fetch job with all necessary relations
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        customer: true,
        craftworker: {
          include: {
            craftworkerProfile: true,
          },
        },
        payment: true,
      },
    })

    // 4. Validate job exists and belongs to authenticated user
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.customerId !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this job' }, { status: 403 })
    }

    // 5. Validate job status is MATCHED
    if (job.status !== 'MATCHED') {
      return NextResponse.json(
        { error: 'Job must be in MATCHED status to create payment', currentStatus: job.status },
        { status: 400 }
      )
    }

    // 6. Check if payment already exists
    if (job.payment) {
      return NextResponse.json(
        { error: 'Payment already exists for this job', paymentId: job.payment.id },
        { status: 400 }
      )
    }

    // 7. Validate craftworker has Stripe account set up
    if (!job.craftworker?.craftworkerProfile?.stripeAccountId) {
      return NextResponse.json(
        { error: 'Craftworker has not completed Stripe onboarding' },
        { status: 400 }
      )
    }

    // 8. Calculate platform fee and craftworker payout
    const commissionRate = job.craftworker.craftworkerProfile.commissionRate.toNumber()
    const platformFee = amount * (commissionRate / 100)
    const craftworkerPayout = amount - platformFee

    // 9. Create Stripe PaymentIntent with application fee
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'eur',
      application_fee_amount: Math.round(platformFee * 100),
      transfer_data: {
        destination: job.craftworker.craftworkerProfile.stripeAccountId,
      },
      transfer_group: `job_${jobId}`,
      metadata: {
        jobId,
        customerId: user.id,
        craftworkerId: job.craftworkerId!,
        platformFee: platformFee.toFixed(2),
        craftworkerPayout: craftworkerPayout.toFixed(2),
      },
      description: `Payment for job: ${job.title}`,
    }, {
      idempotencyKey: `create-intent-${jobId}`, // Prevent duplicate charges
    })

    // 10. Save Payment record in database
    const payment = await prisma.payment.create({
      data: {
        jobId,
        amount,
        platformFee,
        craftworkerPayout,
        status: 'UNPAID',
        stripePaymentIntentId: paymentIntent.id,
      },
    })

    // 11. Return client secret for Stripe Elements
    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentId: payment.id,
      amount,
      platformFee,
      craftworkerPayout,
    })

  } catch (error) {
    console.error('[create-intent] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
