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

    // 6. POBERI PLAČILO NA STRIPE (iz 'requires_capture' v 'succeeded')
    try {
      await stripe.paymentIntents.capture(claimed.stripe_payment_intent_id)
    } catch (stripeError) {
      // Revert to 'paid' so it can be retried
      await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'paid' })
        .eq('id', escrowId)
      throw stripeError
    }

    // 7. POSODOBI STANJE NA ZAVRŠNI 'released'
    await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowId)

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
