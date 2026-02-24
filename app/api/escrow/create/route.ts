import { NextRequest, NextResponse } from 'next/server'
import { stripe, calculateEscrow } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditLog } from '@/lib/escrow'
import { checkRateLimit } from '@/lib/rateLimit'
import { validateEmail, validateAmount, validateRequiredString, validateUUID, collectErrors } from '@/lib/validation'
import { apiSuccess, badRequest, notFound, tooManyRequests, internalError } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      inquiryId,
      partnerId,
      customerEmail,
      amountCents,      // v centih — pošlji iz frontenda
      description,
    } = body

    // 1. INPUT VALIDATION - all checks before any DB/Stripe calls
    const validationErrors = collectErrors(
      validateRequiredString(customerEmail, 'customerEmail'),
      validateEmail(customerEmail),
      validateRequiredString(partnerId, 'partnerId'),
      validateAmount(amountCents, 'amountCents', 100),
      validateRequiredString(description, 'description')
    )

    if (validationErrors.length > 0) {
      return badRequest(validationErrors.map(e => `${e.field}: ${e.message}`).join('; '))
    }

    // Rate limit check (use customerEmail as key)
    const { allowed, retryAfter } = checkRateLimit(
      `escrow_create:${customerEmail}`,
      5,       // max 5 escrows
      60_000   // per minute
    )
    if (!allowed) {
      return tooManyRequests(`Too many requests. Try again in ${retryAfter}s.`)
    }

    const sanitizedDescription = description.trim().slice(0, 500)

    // 2. PREBERI PAKET PARTNERJA (za provizijo)
    const { data: partner, error: partnerErr } = await supabaseAdmin
      .from('partners')
      .select('paket')
      .eq('id', partnerId)
      .maybeSingle()

    if (partnerErr || !partner) {
      return notFound('Partner not found')
    }

    const { commissionRate, commissionCents, payoutCents } =
      calculateEscrow(amountCents, partner.paket as 'start' | 'pro')

    // 3. USTVARI STRIPE PAYMENT INTENT
    // capture_method: 'manual' = sredstva rezervirana, NE pobrana takoj
    // Pobiranje se zgodi v release routu
    const paymentIntent = await stripe.paymentIntents.create({
      amount:         amountCents,
      currency:       'eur',
      capture_method: 'manual',    // ← KLJUČNO za escrow
      receipt_email:  customerEmail,
        description:    description ?? 'LiftGO plačilo za storitev',
      metadata: {
        liftgo_inquiry_id:   inquiryId   ?? '',
        liftgo_partner_id:   partnerId   ?? '',
        liftgo_customer:     customerEmail,
        liftgo_commission:   String(commissionCents),
        liftgo_payout:       String(payoutCents),
      },
    })

    // 4. SHRANI ESCROW TRANSAKCIJO
    const releaseDate = new Date()
    releaseDate.setDate(
      releaseDate.getDate() +
      Number(process.env.ESCROW_AUTO_RELEASE_DAYS ?? 7)
    )

    const { data: escrow, error: escrowErr } = await supabaseAdmin
      .from('escrow_transactions')
      .insert({
        inquiry_id:              inquiryId ?? null,
        partner_id:              partnerId ?? null,
        customer_email:          customerEmail,
        amount_total_cents:      amountCents,
        commission_rate:         commissionRate,
        commission_cents:        commissionCents,
        payout_cents:            payoutCents,
        stripe_payment_intent_id: paymentIntent.id,
        status:                  'pending',
        description:             sanitizedDescription ?? null,
        release_due_at:          releaseDate.toISOString(),
      })
      .select()
      .single()

    if (escrowErr) {
      // Razveljavimo PI ker DB ni uspel
      await stripe.paymentIntents.cancel(paymentIntent.id).catch(() => null)
      console.error('[ESCROW CREATE DB]', escrowErr)
      return internalError('Failed to create transaction.')
    }

    // 5. AUDIT LOG
    await writeAuditLog({
      transactionId: escrow.id,
      eventType:     'created',
      actor:         'system',
      actorId:       'api',
      statusBefore:  null,
      statusAfter:   'pending',
      amountCents,
      metadata: { paymentIntentId: paymentIntent.id },
    })

    // 6. VRNI CLIENT SECRET (za Stripe.js na frontendu)
    return apiSuccess({
      escrowId:      escrow.id,
      clientSecret:  paymentIntent.client_secret,
      amountCents,
      commissionCents,
      payoutCents,
    })

  } catch (err) {
    console.error('[ESCROW CREATE]', err)
    return internalError('Stripe error. Please try again.')
  }
}
