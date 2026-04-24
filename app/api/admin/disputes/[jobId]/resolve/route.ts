import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/sender'
import { ok, fail } from '@/lib/http/response'

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
      return fail('Unauthorized', 401)
    }

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return fail('Forbidden', 403)
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
      return fail('Job not found or not in disputed state', 404)
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
        return fail('Split percentage required', 400)
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
          `Razdelitev (${splitPct!}% / ${100 - splitPct!}%)`
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
        sendEmail(job.customer.email, {
          subject: `Spor rešen: ${job.title}`,
          html: emailContent,
        }),
        job.craftworker && sendEmail(job.craftworker.email, {
          subject: `Spor rešen: ${job.title}`,
          html: emailContent,
        })
      ])

      return ok({ success: true })
    } catch (stripeError) {
      console.error('[API] Stripe transaction failed:', stripeError)
      return fail('Payment processing failed', 500)
    }
  } catch (error) {
    console.error('[API] Failed to resolve dispute:', error)
    return fail('Internal server error', 500)
  }
}
