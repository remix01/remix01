/**
 * ASYNC JOB QUEUE INTEGRATION GUIDE
 * 
 * This document explains how to integrate the async job queue into existing API routes.
 * The pattern ensures DB transactions commit BEFORE any side effects (Stripe calls, emails) execute.
 * 
 * KEY PRINCIPLE: DB first, then jobs
 * If DB fails → no jobs enqueued → no external calls made
 * If external call fails → jobs retry automatically up to 3 times
 */

/**
 * BEFORE: Synchronous pattern (blocking)
 * Problem: If Stripe fails after DB commit, user sees error but DB already updated
 */
export async function OLD_PATTERN_EXAMPLE() {
  // 1. DB transaction
  const escrow = await db.insert({ status: 'paid' })
  
  // 2. Stripe call (BLOCKING - user waits)
  try {
    await stripe.paymentIntents.capture(piId) // ← Can fail and block user
  } catch (err) {
    // Already in DB as 'paid', Stripe failed - inconsistent state
    return error
  }
  
  // 3. Audit log (BLOCKING)
  await db.insert.auditLog()
  
  return success
}

/**
 * AFTER: Async pattern (non-blocking)
 * Benefit: DB commits first, user gets response, side effects happen async
 */
export async function NEW_PATTERN_EXAMPLE() {
  // 1. DB transaction commits FIRST
  const escrow = await db.transaction(async (trx) => {
    await assertTransition('escrow', escrowId, 'released')
    return await trx.escrow.update({
      id: escrowId,
      status: 'released',
      released_at: new Date(),
    })
  })

  // 2. ONLY AFTER DB commits, enqueue jobs
  // If DB failed above, these never execute
  await enqueue('stripeCapture', {
    escrowId: escrow.id,
    paymentIntentId: escrow.stripe_payment_intent_id,
  }, { retries: 3 })

  await enqueue('sendEmail', {
    to: escrow.customer_email,
    template: 'escrow_released',
    escrowId: escrow.id,
  })

  await enqueue('auditLog', {
    escrowId: escrow.id,
    event: 'release_initiated',
    userId: session.user.id,
  })

  // 3. Return immediately - jobs run in background
  return NextResponse.json({
    success: true,
    message: 'Payment released. Funds will arrive in 2-5 business days.',
  })
}

/**
 * MIGRATION CHECKLIST
 * 
 * For each route that makes Stripe calls or sends emails:
 * 
 * 1. Move DB update INSIDE a transaction block
 * 2. Run state machine validation BEFORE the transaction
 * 3. After DB commits, enqueue jobs (don't call Stripe directly)
 * 4. Return immediately with success response
 * 5. Jobs handle retries automatically
 * 
 * Routes to update:
 * [ ] /api/escrow/create - enqueue Stripe confirmations
 * [ ] /api/escrow/release - enqueue Stripe capture
 * [ ] /api/escrow/refund - enqueue Stripe cancel
 * [ ] /api/admin/escrow/resolve-dispute - enqueue Stripe operations
 * [ ] /api/stripe/webhook - enqueue audit logs for webhook events
 * [ ] /api/cron/escrow-auto-release - enqueue Stripe captures for batch processing
 */

/**
 * JOB QUEUE GUARANTEES
 * 
 * ✅ Idempotency: All jobs use idempotency keys (paymentIntentId_operation)
 *    Running the same job twice is safe
 * 
 * ✅ Retries: Failed jobs retry up to 3 times with exponential backoff (5s, 15s, 45s)
 *    Transient failures are automatically recovered
 * 
 * ✅ No Stripe double-charges: Idempotency keys prevent duplicate captures
 *    Even if a job retries, Stripe returns cached result
 * 
 * ✅ Audit trail: Every operation is logged with timestamps and outcomes
 *    Admin can see which jobs failed and manual intervention points
 * 
 * ❌ Persistence: In-memory queue only
 *    On server restart, in-flight jobs are lost
 *    Consider upgrading to Redis/Bull for production
 */

/**
 * EXAMPLE: Refactored /api/escrow/release route
 */
import { enqueue } from '@/lib/jobs'
import { assertTransition } from '@/lib/state-machine'

export async function POST_REFACTORED(request: Request) {
  const { escrowId } = await request.json()

  try {
    // 1. Validate state transition BEFORE DB
    await assertTransition('escrow', escrowId, 'released')

    // 2. Update DB in transaction
    const { data: escrow, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowId)
      .eq('status', 'paid')
      .select()
      .single()

    if (error || !escrow) {
      throw new Error('Failed to update escrow or already processed')
    }

    // 3. AFTER DB commits, enqueue jobs
    await enqueue('stripeCapture', {
      escrowId: escrow.id,
      paymentIntentId: escrow.stripe_payment_intent_id,
    })

    await enqueue('sendEmail', {
      to: escrow.customer_email,
      template: 'escrow_released',
      escrowId: escrow.id,
    })

    await enqueue('auditLog', {
      escrowId: escrow.id,
      event: 'released',
      userId: session?.user?.id,
    })

    // 4. Return immediately
    return NextResponse.json({
      success: true,
      message: 'Payment released.',
    })
  } catch (err) {
    console.error('[ESCROW RELEASE]', err)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
