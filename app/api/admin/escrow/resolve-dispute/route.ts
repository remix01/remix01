import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getEscrowTransaction, updateEscrowStatus } from '@/lib/escrow'
import { stripe } from '@/lib/stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(request: NextRequest) {
  try {
    // 1. SAMO ADMIN
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get: (n) => cookieStore.get(n)?.value } }
    )
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user.user_metadata?.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Samo admin.' }, { status: 403 })
    }

    const { escrowId, resolution, adminNotes } = await request.json()
    // resolution: 'full_refund' | 'partial_refund' | 'release_to_partner'

    // 2. ATOMICALLY CLAIM — samo če je status natanko 'disputed' in še ni bil spremenjen
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'resolving' })
      .eq('id', escrowId)
      .eq('status', 'disputed')
      .select()
      .maybeSingle()

    if (!claimed) {
      return NextResponse.json(
        { success: false, message: 'Transakcija ni v stanju spora ali je že v reševanju.' },
        { status: 400 }
      )
    }

    let newEscrowStatus: 'refunded' | 'released' = 'released'

    // ========== TRANSACTIONAL CONSISTENCY FIX ==========
    // Perform Stripe operation FIRST, verify success, THEN update DB
    // Never update DB status before confirming Stripe success
    
    let stripeSuccess = false
    try {
      if (resolution === 'full_refund') {
        // Preklici PI → vrni stranki
        console.log(`[RESOLVE DISPUTE] Cancelling PI for refund: ${claimed.stripe_payment_intent_id}`)
        await stripe.paymentIntents.cancel(claimed.stripe_payment_intent_id)
        newEscrowStatus = 'refunded'
        stripeSuccess = true
        console.log(`[RESOLVE DISPUTE] Successfully cancelled PI`)

      } else if (resolution === 'release_to_partner') {
        // Poberi PI → sprosti obrtniku
        console.log(`[RESOLVE DISPUTE] Capturing PI for release: ${claimed.stripe_payment_intent_id}`)
        await stripe.paymentIntents.capture(claimed.stripe_payment_intent_id)
        newEscrowStatus = 'released'
        stripeSuccess = true
        console.log(`[RESOLVE DISPUTE] Successfully captured PI`)
      } else {
        throw new Error(`Invalid resolution type: ${resolution}`)
      }
    } catch (stripeError: any) {
      // Stripe operation failed - revert status back to 'disputed' for retry
      console.error(`[RESOLVE DISPUTE] Stripe operation failed: ${stripeError.message}`)
      const { error: revertError } = await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'disputed' })
        .eq('id', escrowId)
      
      if (revertError) {
        console.error(`[RESOLVE DISPUTE] Failed to revert status: ${revertError.message}`)
      }
      
      return NextResponse.json(
        { success: false, message: `Stripe napaka: ${stripeError.message}` },
        { status: 402 } // Payment Required status for Stripe errors
      )
    }

    // ONLY proceed with DB updates after Stripe success
    if (!stripeSuccess) {
      throw new Error('Stripe success not confirmed - DB updates prevented')
    }

    // Posodobi spor
    const { error: disputeError } = await supabaseAdmin
      .from('escrow_disputes')
      .update({
        status:      resolution === 'full_refund' ? 'resolved_customer' : 'resolved_partner',
        admin_notes: adminNotes ?? null,
        resolved_by: session.user.id,
        resolved_at: new Date().toISOString(),
        resolution,
      })
      .eq('transaction_id', escrowId)

    if (disputeError) {
      console.error(`[RESOLVE DISPUTE] Failed to update dispute: ${disputeError.message}`)
      return NextResponse.json(
        { success: false, message: 'Napaka pri posodobi spora. Kontaktirajte support.' },
        { status: 500 }
      )
    }

    // Posodobi escrow na končno stanje
    const { error: escrowError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: newEscrowStatus,
        ...(newEscrowStatus === 'refunded'  && { refunded_at: new Date().toISOString() }),
        ...(newEscrowStatus === 'released'  && { released_at: new Date().toISOString() }),
      })
      .eq('id', escrowId)

    if (escrowError) {
      console.error(`[RESOLVE DISPUTE] Failed to update escrow status: ${escrowError.message}`)
      return NextResponse.json(
        { success: false, message: 'Napaka pri posodobi escrow. Kontaktirajte support.' },
        { status: 500 }
      )
    }

    // Zapiši audit
    await updateEscrowStatus({
      transactionId: claimed.id,
      newStatus:     newEscrowStatus,
      actor:         'admin',
      actorId:       session.user.id,
      extraFields: {
        ...(newEscrowStatus === 'refunded'  && { refunded_at: new Date().toISOString() }),
        ...(newEscrowStatus === 'released'  && { released_at: new Date().toISOString() }),
      },
      metadata: { resolution, adminNotes },
    })

    return NextResponse.json({
      success:    true,
      resolution,
      newStatus:  newEscrowStatus,
    })

  } catch (err) {
    console.error('[ADMIN RESOLVE]', err)
    return NextResponse.json(
      { success: false, message: 'Napaka pri reševanju spora.' },
      { status: 500 }
    )
  }
}
