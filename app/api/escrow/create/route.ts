import { NextRequest, NextResponse } from 'next/server'
import { stripe, calculateEscrow } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditLog } from '@/lib/escrow'

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

    // 1. VALIDACIJA
    if (!customerEmail || !amountCents) {
      return NextResponse.json(
        { success: false, error: 'Manjkajoči podatki.' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { success: false, error: 'Neveljaven email naslov' },
        { status: 400 }
      )
    }

    // Amount bounds
    if (amountCents < 100) {
      return NextResponse.json(
        { success: false, error: 'Znesek mora biti vsaj 1€ (100 centov)' },
        { status: 400 }
      )
    }
    if (amountCents > 1_000_000_00) { // 1M EUR max
      return NextResponse.json(
        { success: false, error: 'Znesek presega dovoljeno mejo' },
        { status: 400 }
      )
    }

    // Description sanitization
    if (!description?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Opis je obvezen' },
        { status: 400 }
      )
    }
    const sanitizedDescription = description.trim().slice(0, 500)

    // 2. PREBERI PAKET PARTNERJA (za provizijo)
    const { data: partner, error: partnerErr } = await supabaseAdmin
      .from('partners')
      .select('paket')
      .eq('id', partnerId)
      .single()

    if (partnerErr || !partner) {
      return NextResponse.json(
        { success: false, error: 'Partner ni najden.' },
        { status: 404 }
      )
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
      return NextResponse.json(
        { success: false, error: 'Napaka pri ustvarjanju transakcije.' },
        { status: 500 }
      )
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
    return NextResponse.json({
      success:            true,
      escrowId:           escrow.id,
      clientSecret:       paymentIntent.client_secret,
      amountCents,
      commissionCents,
      payoutCents,
    })

  } catch (err) {
    console.error('[ESCROW CREATE]', err)
    return NextResponse.json(
      { success: false, error: 'Stripe napaka. Poskusite znova.' },
      { status: 500 }
    )
  }
}
