import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

const createIntentSchema = z.object({
  jobId: z.string(),
  amount: z.number().min(1)
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { jobId, amount } = createIntentSchema.parse(body)

    // Fetch job with all relations in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const job = await tx.job.findUnique({
        where: { id: jobId },
        include: {
          customer: true,
          craftworker: {
            include: {
              craftworkerProfile: true
            }
          },
          payment: true
        }
      })

      if (!job) {
        throw new Error('Job not found')
      }

      // Validation: user must be customer of this job
      if (job.customerId !== user.id) {
        throw new Error('Not authorized for this job')
      }

      // Validation: job status must be MATCHED
      if (job.status !== 'MATCHED') {
        throw new Error('Job must be in MATCHED status to create payment')
      }

      // Validation: craftworker must have completed Stripe onboarding
      if (!job.craftworker?.craftworkerProfile?.stripeAccountId) {
        throw new Error('Craftworker has not completed Stripe onboarding')
      }

      if (!job.craftworker.craftworkerProfile.stripeOnboardingComplete) {
        throw new Error('Craftworker Stripe onboarding incomplete')
      }

      // Check if payment already exists
      if (job.payment) {
        throw new Error('Payment already exists for this job')
      }

      const commissionRate = job.craftworker.craftworkerProfile.commissionRate.toNumber()
      const platformFee = amount * (commissionRate / 100)
      const craftworkerPayout = amount - platformFee

      // Create Stripe PaymentIntent with application fee
      const idempotencyKey = `job_${jobId}_${Date.now()}`
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'eur',
        application_fee_amount: Math.round(platformFee * 100),
        transfer_data: {
          destination: job.craftworker.craftworkerProfile.stripeAccountId
        },
        transfer_group: `job_${jobId}`,
        metadata: {
          jobId,
          customerId: job.customerId,
          craftworkerId: job.craftworkerId!,
          platformFee: platformFee.toString(),
          craftworkerPayout: craftworkerPayout.toString()
        }
      }, {
        idempotencyKey
      })

      // Create Payment record
      const payment = await tx.payment.create({
        data: {
          jobId,
          amount,
          platformFee,
          craftworkerPayout,
          status: 'UNPAID',
          stripePaymentIntentId: paymentIntent.id
        }
      })

      return {
        clientSecret: paymentIntent.client_secret,
        payment
      }
    })

    return NextResponse.json({
      clientSecret: result.clientSecret,
      paymentId: result.payment.id
    })

  } catch (error) {
    console.error('[create-intent] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
