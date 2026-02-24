import { NextRequest, NextResponse } from 'next/server'
import { stripe, calculateEscrow } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getEscrowTransaction, updateEscrowStatus } from '@/lib/escrow'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // 1. AVTENTIKACIJA — samo prijavljen partner ali admin
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ success: false, message: 'Nepooblaščen dostop.' }, { status: 401 })
    }

    const { escrowId, confirmedByCustomer } = await request.json()

    // 2. PREBERI TRANSAKCIJO ZA PREVERJANJE LASTNIŠTVA
    const escrow = await getEscrowTransaction(escrowId)

    // 3. PREVERI LASTNIŠTVO
    const isPartner = escrow.partner_id === session.user.id
    const isAdmin   = session.user.user_metadata?.role === 'admin'
    if (!isPartner && !isAdmin) {
      return NextResponse.json({ success: false, message: 'Nimate dostopa.' }, { status: 403 })
    }

    // 4. ATOMICALLY CLAIM — samo če je status natanko 'paid' in še ni bilo sproščeno
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'releasing' })
      .eq('id', escrowId)
      .eq('status', 'paid')
      .select()
      .maybeSingle()

    if (!claimed) {
      // Transakcija ni v stanju 'paid' ali je že bila sočasno spremenjena
      const { data: current } = await supabaseAdmin
        .from('escrow_transactions')
        .select('status')
        .eq('id', escrowId)
        .maybeSingle()

      const status = current?.status
      if (status === 'disputed') {
        return NextResponse.json(
          { success: false, message: 'Transakcija ima odprt spor. Sproščanje ni možno.' },
          { status: 400 }
        )
      }
      if (status === 'released') {
        return NextResponse.json(
          { success: false, message: 'Transakcija je že bila sproščena.' },
          { status: 400 }
        )
      }
      if (status === 'refunded') {
        return NextResponse.json(
          { success: false, message: 'Transakcija je bila povrnjena.' },
          { status: 400 }
        )
      }
      return NextResponse.json(
        { success: false, message: `Transakcija v stanju '${status}' ne more biti sproščena.` },
        { status: 400 }
      )
    }

    // 5. DOUBLE-CHECK — preveri da ni odprtega spora (belt-and-suspenders)
    const { count: disputeCount } = await supabaseAdmin
      .from('escrow_disputes')
      .select('id', { count: 'exact', head: true })
      .eq('transaction_id', escrowId)
      .eq('status', 'open')
    if ((disputeCount ?? 0) > 0) {
      // Revert atomic claim
      await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'paid' })
        .eq('id', escrowId)
      return NextResponse.json(
        { success: false, message: 'Transakcija ima odprt spor. Sproščanje ni možno.' },
        { status: 400 }
      )
    }

    // 6. TRANSACTIONAL CONSISTENCY FIX
    // =====================================
    // IMPORTANT: Stripe capture must succeed BEFORE DB status is finalized
    // We use the 'releasing' intermediate status as a guard:
    // - If Stripe fails → revert to 'paid', transaction can be retried
    // - If Stripe succeeds → immediately commit to 'released' in DB
    // - This ensures DB status never gets updated before Stripe confirms success
    
    let stripeSuccess = false
    try {
      // Capture payment in Stripe (this must succeed)
      await stripe.paymentIntents.capture(claimed.stripe_payment_intent_id)
      stripeSuccess = true
      console.log(`[ESCROW RELEASE] Successfully captured PI: ${claimed.stripe_payment_intent_id}`)
    } catch (stripeError: any) {
      // Stripe operation failed - revert status back to 'paid' for retry
      console.error(`[ESCROW RELEASE] Stripe capture failed: ${stripeError.message}`)
      const { error: revertError } = await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'paid' })
        .eq('id', escrowId)
      
      if (revertError) {
        console.error(`[ESCROW RELEASE] Failed to revert status: ${revertError.message}`)
      }
      
      return NextResponse.json(
        { success: false, message: `Stripe napaka: ${stripeError.message}` },
        { status: 402 } // Payment Required status for Stripe errors
      )
    }

    // 7. ONLY UPDATE DB AFTER STRIPE SUCCESS
    // At this point, Stripe has confirmed the capture succeeded
    if (!stripeSuccess) {
      throw new Error('Stripe success flag not set - this should never happen')
    }

    const { error: updateError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowId)

    if (updateError) {
      console.error(`[ESCROW RELEASE] DB update failed after Stripe success: ${updateError.message}`)
      // Even if DB update fails, Stripe was successful - we must retry the DB update
      // This is a critical state that needs manual intervention/retry
      return NextResponse.json(
        { success: false, message: 'Napaka pri posodobi stanja. Kontaktirajte support.' },
        { status: 500 }
      )
    }

    // 8. ZAPIŠI AUDIT
    await updateEscrowStatus({
      transactionId: escrow.id,
      newStatus:     'released',
      actor:         isAdmin ? 'admin' : 'partner',
      actorId:       session.user.id,
      extraFields:   { released_at: new Date().toISOString() },
      metadata: {
        confirmedByCustomer: confirmedByCustomer ?? false,
        releasedBy: isAdmin ? 'admin' : 'partner',
      },
    })

    return NextResponse.json({
      success: true,
      message:     'Sredstva sproščena. Izplačilo bo obdelano v 2–5 delovnih dneh.',
      payoutCents: escrow.payout_cents,
    })

  } catch (err) {
    console.error('[ESCROW RELEASE]', err)
    return NextResponse.json(
      { success: false, message: 'Napaka pri sproščanju. Kontaktirajte support.' },
      { status: 500 }
    )
  }
}
