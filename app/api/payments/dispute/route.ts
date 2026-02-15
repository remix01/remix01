import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse and validate request
    const body = await request.json()
    const validation = disputeSchema.safeParse(body)
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { jobId, reason } = validation.data

    // 3. Fetch job with payment info
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        payment: true,
        customer: true,
        craftworker: true,
      },
    })

    // 4. Validate job exists and user is the customer
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }

    if (job.customerId !== user.id) {
      return NextResponse.json({ error: 'Not authorized for this job' }, { status: 403 })
    }

    // 5. Validate payment exists
    if (!job.payment) {
      return NextResponse.json({ error: 'No payment found for this job' }, { status: 400 })
    }

    // 6. Can only dispute if payment is HELD or RELEASED (within dispute window)
    if (job.payment.status !== 'HELD' && job.payment.status !== 'RELEASED') {
      return NextResponse.json(
        { error: 'Payment cannot be disputed in current status', currentStatus: job.payment.status },
        { status: 400 }
      )
    }

    // 7. Update job and payment status to DISPUTED
    const result = await prisma.$transaction(async (tx) => {
      const updatedJob = await tx.job.update({
        where: { id: jobId },
        data: {
          status: 'DISPUTED',
        },
      })

      const updatedPayment = await tx.payment.update({
        where: { id: job.payment!.id },
        data: {
          status: 'DISPUTED',
          disputeReason: reason,
        },
      })

      return { updatedJob, updatedPayment }
    })

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

    return NextResponse.json({
      success: true,
      jobId: result.updatedJob.id,
      jobStatus: result.updatedJob.status,
      paymentStatus: result.updatedPayment.status,
      message: 'Dispute opened successfully. Admin team will review within 24-48 hours.',
    })

  } catch (error) {
    console.error('[dispute] Error:', error)
    return NextResponse.json(
      { error: 'Failed to open dispute', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
