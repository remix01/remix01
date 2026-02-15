import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/sender'

const resolveSchema = z.object({
  resolution: z.enum(['release_to_craftworker', 'refund_to_customer', 'split']),
  splitPct: z.number().min(0).max(100).optional(),
  reason: z.string().min(10),
})

interface RouteContext {
  params: Promise<{ jobId: string }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    // Verify admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { role: true }
    })

    if (dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { jobId } = await context.params
    const body = await request.json()
    const { resolution, splitPct, reason } = resolveSchema.parse(body)

    // Fetch job and payment
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      include: {
        payment: true,
        customer: true,
        craftworker: {
          include: {
            craftworkerProfile: true
          }
        }
      }
    })

    if (!job || !job.payment || job.status !== 'DISPUTED') {
      return NextResponse.json(
        { error: 'Job not found or not in disputed state' },
        { status: 404 }
      )
    }

    const payment = job.payment
    const netAmount = Number(payment.amount) - Number(payment.platformFee)

    let customerRefund = 0
    let craftworkerPayout = 0

    // Calculate amounts based on resolution type
    if (resolution === 'refund_to_customer') {
      customerRefund = Number(payment.amount)
    } else if (resolution === 'release_to_craftworker') {
      craftworkerPayout = netAmount
    } else if (resolution === 'split') {
      if (!splitPct) {
        return NextResponse.json({ error: 'Split percentage required' }, { status: 400 })
      }
      customerRefund = (netAmount * splitPct) / 100
      craftworkerPayout = (netAmount * (100 - splitPct)) / 100
    }

    // Execute Stripe transactions
    try {
      // Refund to customer if applicable
      if (customerRefund > 0 && payment.stripePaymentIntentId) {
        await stripe.refunds.create({
          payment_intent: payment.stripePaymentIntentId,
          amount: Math.round(customerRefund * 100), // Convert to cents
        })
      }

      // Transfer to craftworker if applicable
      if (craftworkerPayout > 0 && job.craftworker?.craftworkerProfile?.stripeAccountId) {
        const transfer = await stripe.transfers.create({
          amount: Math.round(craftworkerPayout * 100),
          currency: 'eur',
          destination: job.craftworker.craftworkerProfile.stripeAccountId,
          metadata: {
            jobId: job.id,
            resolution: 'dispute_resolved',
          }
        })

        await prisma.payment.update({
          where: { id: payment.id },
          data: { stripeTransferId: transfer.id }
        })
      }

      // Update payment and job status
      await prisma.$transaction([
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: resolution === 'refund_to_customer' ? 'REFUNDED' : 'RELEASED',
            releasedAt: new Date(),
            disputeReason: reason,
          }
        }),
        prisma.job.update({
          where: { id: jobId },
          data: {
            status: resolution === 'refund_to_customer' ? 'CANCELLED' : 'COMPLETED',
            completedAt: new Date(),
          }
        })
      ])

      // Send emails to both parties
      const emailContent = `
        <h2>Spor rešen</h2>
        <p>Spoštovani,</p>
        <p>Spor za projekt "${job.title}" je bil rešen.</p>
        <h3>Odločitev:</h3>
        <p><strong>${
          resolution === 'refund_to_customer' ? 'Vračilo stranki' :
          resolution === 'release_to_craftworker' ? 'Sprostitev obrtniku' :
          `Razdelitev (${splitPct}% / ${100 - splitPct}%)`
        }</strong></p>
        <h3>Obrazložitev:</h3>
        <p>${reason}</p>
        <h3>Končni zneski:</h3>
        <ul>
          <li>Stranka (${job.customer.name}): €${customerRefund.toFixed(2)}</li>
          <li>Obrtnik (${job.craftworker?.name}): €${craftworkerPayout.toFixed(2)}</li>
        </ul>
        <p>Lep pozdrav,<br/>LiftGO Tim</p>
      `

      await Promise.all([
        sendEmail({
          to: job.customer.email,
          subject: `Spor rešen: ${job.title}`,
          html: emailContent,
        }),
        job.craftworker && sendEmail({
          to: job.craftworker.email,
          subject: `Spor rešen: ${job.title}`,
          html: emailContent,
        })
      ])

      return NextResponse.json({ success: true })
    } catch (stripeError) {
      console.error('[API] Stripe transaction failed:', stripeError)
      return NextResponse.json(
        { error: 'Payment processing failed' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[API] Failed to resolve dispute:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
