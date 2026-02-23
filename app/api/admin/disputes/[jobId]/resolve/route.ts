import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
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

    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('role')
      .eq('email', user.email!)
      .single()

    if (userError || dbUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { jobId } = await context.params
    const body = await request.json()
    const { resolution, splitPct, reason } = resolveSchema.parse(body)

    // Fetch job and payment
    const { data: job, error: jobError } = await supabaseAdmin
      .from('job')
      .select(`
        *,
        payment:payment_id(*),
        customer:customer_id(*),
        craftworker:craftworker_id(*, craftworker_profile(*))
      `)
      .eq('id', jobId)
      .single()

    if (jobError || !job || !job.payment || job.status !== 'DISPUTED') {
      return NextResponse.json(
        { error: 'Job not found or not in disputed state' },
        { status: 404 }
      )
    }

    const payment = job.payment
    const netAmount = Number(payment.amount) - Number(payment.platform_fee)

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
      if (customerRefund > 0 && payment.stripe_payment_intent_id) {
        await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
          amount: Math.round(customerRefund * 100), // Convert to cents
        })
      }

      // Transfer to craftworker if applicable
      if (craftworkerPayout > 0 && job.craftworker?.craftworker_profile?.stripe_account_id) {
        const transfer = await stripe.transfers.create({
          amount: Math.round(craftworkerPayout * 100),
          currency: 'eur',
          destination: job.craftworker.craftworker_profile.stripe_account_id,
          metadata: {
            jobId: job.id,
            resolution: 'dispute_resolved',
          }
        })

        await supabaseAdmin
          .from('payment')
          .update({ stripe_transfer_id: transfer.id })
          .eq('id', payment.id)
      }

      // Update payment and job status
      const { error: paymentError } = await supabaseAdmin
        .from('payment')
        .update({
          status: resolution === 'refund_to_customer' ? 'REFUNDED' : 'RELEASED',
          released_at: new Date().toISOString(),
          dispute_reason: reason,
        })
        .eq('id', payment.id)

      const { error: jobUpdateError } = await supabaseAdmin
        .from('job')
        .update({
          status: resolution === 'refund_to_customer' ? 'CANCELLED' : 'COMPLETED',
          completed_at: new Date().toISOString(),
        })
        .eq('id', jobId)

      if (paymentError || jobUpdateError) {
        throw new Error('Database update failed')
      }

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
