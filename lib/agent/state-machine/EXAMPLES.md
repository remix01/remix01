/**
 * STATE MACHINE GUARD - EXAMPLE API ROUTE INTEGRATIONS
 * 
 * This file shows how to integrate the state machine guard into existing API routes.
 * Copy these patterns to add state validation to your endpoints.
 */

/**
 * EXAMPLE 1: Escrow Release Route
 * 
 * Validate transition from 'paid' → 'released' before capturing payment
 */

import { NextRequest, NextResponse } from 'next/server'
import { assertTransition } from '@/lib/agent/state-machine'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST_escrow_release(request: NextRequest) {
  try {
    const { escrowId } = await request.json()

    // 1. SESSION/AUTH CHECK (existing)
    const session = await getSession(request)
    if (!session) return unauthorized()

    // 2. PERMISSION CHECK (existing)
    const escrow = await supabaseAdmin
      .from('escrow_transactions')
      .select('*')
      .eq('id', escrowId)
      .single()
    
    if (!escrow) return notFound()
    if (escrow.partner_id !== session.user.id) return forbidden()

    // 3. INPUT VALIDATION (existing)
    if (!escrowId || typeof escrowId !== 'string') {
      return badRequest('Invalid escrowId')
    }

    // 4. ✨ STATE MACHINE GUARD (NEW)
    await assertTransition('escrow', escrowId, 'released')

    // 5. DATABASE UPDATE (safe now - transition is valid)
    const { data: updated, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowId)
      .select()
      .single()

    if (error) throw error

    // 6. ASYNC OPERATIONS (after DB commits)
    await enqueue('stripeCapture', {
      escrowId: escrow.id,
      paymentIntentId: escrow.stripe_payment_intent_id,
    })

    return NextResponse.json({
      success: true,
      message: 'Payment released. Funds will arrive in 2-5 business days.',
      escrow: updated,
    })
  } catch (err: any) {
    // Handle state machine errors
    if (err.code === 409) {
      return NextResponse.json(
        { success: false, error: err.error },
        { status: 409 }
      )
    }
    if (err.code === 404) {
      return NextResponse.json(
        { success: false, error: err.error },
        { status: 404 }
      )
    }

    console.error('[ESCROW RELEASE]', err)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * EXAMPLE 2: Escrow Dispute Route
 * 
 * Validate transition from 'paid' → 'disputed' when customer opens a dispute
 */

export async function POST_escrow_dispute(request: NextRequest) {
  try {
    const { escrowId, reason } = await request.json()

    // Auth and permission checks...
    const session = await getSession(request)
    if (!session) return unauthorized()

    // ✨ STATE MACHINE GUARD
    await assertTransition('escrow', escrowId, 'disputed')

    // Create dispute record
    const { data: dispute, error: disputeError } = await supabaseAdmin
      .from('escrow_disputes')
      .insert({
        transaction_id: escrowId,
        opened_by: session.user.id,
        reason,
        status: 'open',
      })
      .select()
      .single()

    if (disputeError) throw disputeError

    // Update escrow status to disputed
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'disputed' })
      .eq('id', escrowId)
      .select()
      .single()

    if (updateError) throw updateError

    // Notify admin
    await enqueue('sendEmail', {
      to: ADMIN_EMAIL,
      template: 'dispute_opened',
      data: { escrowId, disputeId: dispute.id, reason },
    })

    return NextResponse.json({
      success: true,
      message: 'Dispute opened. Our team will review within 24 hours.',
      dispute,
    })
  } catch (err: any) {
    if (err.code === 409) {
      // Only 'paid' status can transition to 'disputed'
      return NextResponse.json(
        { success: false, error: 'Escrow is not in a state that can be disputed' },
        { status: 409 }
      )
    }
    throw err
  }
}

/**
 * EXAMPLE 3: Inquiry Accept Offer Route
 * 
 * Validate transition from 'offer_received' → 'accepted' when accepting an offer
 */

export async function POST_inquiry_accept(request: NextRequest) {
  try {
    const { inquiryId, offerId } = await request.json()

    // Auth checks...
    const session = await getSession(request)
    if (!session) return unauthorized()

    // ✨ STATE MACHINE GUARD
    // Inquiry must be in 'offer_received' to accept an offer
    await assertTransition('inquiry', inquiryId, 'accepted')

    // Mark inquiry as accepted
    const { data: inquiry, error: inquiryError } = await supabaseAdmin
      .from('inquiries')
      .update({
        status: 'accepted',
        accepted_offer_id: offerId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', inquiryId)
      .select()
      .single()

    if (inquiryError) throw inquiryError

    // Mark other offers as rejected
    await supabaseAdmin
      .from('ponudbe')
      .update({ status: 'zavrnjena' })
      .eq('inquiry_id', inquiryId)
      .neq('id', offerId)

    // Mark accepted offer
    await supabaseAdmin
      .from('ponudbe')
      .update({ status: 'sprejeta' })
      .eq('id', offerId)

    // Notify partner
    await enqueue('sendEmail', {
      to: inquiry.partner_email,
      template: 'offer_accepted',
      data: { inquiryId, offerId },
    })

    return NextResponse.json({
      success: true,
      message: 'Offer accepted. Escrow will be created next.',
      inquiry,
    })
  } catch (err: any) {
    if (err.code === 409) {
      return NextResponse.json(
        { success: false, error: 'Inquiry cannot accept offers in current state' },
        { status: 409 }
      )
    }
    throw err
  }
}

/**
 * EXAMPLE 4: Admin Resolve Dispute Route
 * 
 * Validate transition from 'disputed' → 'released' or 'refunded'
 */

export async function POST_admin_resolve_dispute(request: NextRequest) {
  try {
    const { escrowId, resolution } = await request.json() // 'released' or 'refunded'

    // Admin check...
    const session = await getSession(request)
    if (session?.user?.role !== 'admin') return forbidden()

    // ✨ STATE MACHINE GUARD
    // Disputed escrow can transition to 'released' or 'refunded'
    await assertTransition('escrow', escrowId, resolution)

    // Update escrow status
    const { data: updated, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', escrowId)
      .select()
      .single()

    if (error) throw error

    // Close dispute
    await supabaseAdmin
      .from('escrow_disputes')
      .update({
        status: 'closed',
        resolved_by: session.user.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('transaction_id', escrowId)
      .eq('status', 'open')

    // Enqueue Stripe operation
    if (resolution === 'released') {
      await enqueue('stripeCapture', { escrowId })
    } else if (resolution === 'refunded') {
      await enqueue('stripeRefund', { escrowId })
    }

    return NextResponse.json({
      success: true,
      message: `Dispute resolved. Escrow ${resolution}.`,
      escrow: updated,
    })
  } catch (err: any) {
    if (err.code === 409) {
      return NextResponse.json(
        {
          success: false,
          error: `Cannot resolve: Escrow state does not allow transition to '${resolution}'`,
        },
        { status: 409 }
      )
    }
    throw err
  }
}

/**
 * EXAMPLE 5: Complete Inquiry Route
 * 
 * Validate transition from 'accepted' → 'completed' when work is finished
 */

export async function POST_inquiry_complete(request: NextRequest) {
  try {
    const { inquiryId } = await request.json()

    // Auth and permission checks...
    const session = await getSession(request)
    if (!session) return unauthorized()

    // ✨ STATE MACHINE GUARD
    // Inquiry must be 'accepted' to mark as complete
    await assertTransition('inquiry', inquiryId, 'completed')

    // Mark as completed
    const { data: inquiry, error } = await supabaseAdmin
      .from('inquiries')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', inquiryId)
      .select()
      .single()

    if (error) throw error

    // Send completion email
    await enqueue('sendEmail', {
      to: inquiry.customer_email,
      template: 'work_completed',
      data: { inquiryId },
    })

    return NextResponse.json({
      success: true,
      message: 'Work marked as completed.',
      inquiry,
    })
  } catch (err: any) {
    if (err.code === 409) {
      return NextResponse.json(
        { success: false, error: 'Inquiry cannot be completed in current state' },
        { status: 409 }
      )
    }
    throw err
  }
}

/**
 * COMMON PATTERNS
 * 
 * 1. ALWAYS validate BEFORE DB update:
 *    ✅ DO: await assertTransition(...); then update DB
 *    ❌ DON'T: Update DB first, then validate
 * 
 * 2. Handle 409 conflicts specifically:
 *    ✅ DO: if (err.code === 409) return conflict(err.error)
 *    ❌ DON'T: Generic error for all failures
 * 
 * 3. Enqueue async operations AFTER DB commits:
 *    ✅ DO: DB update → enqueue jobs → return response
 *    ❌ DON'T: Stripe calls → DB update → enqueue
 * 
 * 4. Log for debugging:
 *    ✅ DO: console.log or enqueue audit logs
 *    ❌ DON'T: Silent failures make debugging hard
 */
