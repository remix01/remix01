import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { writeAuditLog } from '@/lib/escrow'

export const maxDuration = 60

export async function GET(request: NextRequest) {
  // Zavaruj cron endpoint z secret headerjem
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ========== OPTIMISTIC LOCKING: Atomically claim transactions ==========
  // Update status to 'releasing' for only transactions still in 'paid' state
  // This prevents concurrent cron instances from processing the same transactions
  const { data: claimed, error: claimError } = await supabaseAdmin
    .from('escrow_transactions')
    .update({ status: 'releasing' })
    .eq('status', 'paid')
    .lt('release_due_at', new Date().toISOString())
    .select('id, stripe_payment_intent_id, partner_id, amount_total_cents, platform_fee_cents')
    .limit(20)

  if (claimError) {
    console.error('[CRON AUTO-RELEASE] Claim error:', claimError)
    return NextResponse.json({ error: claimError.message }, { status: 500 })
  }

  if (!claimed || claimed.length === 0) {
    console.log('[CRON AUTO-RELEASE] No transactions to release')
    return NextResponse.json({ processed: 0, results: [] })
  }

  console.log(`[CRON AUTO-RELEASE] Claimed ${claimed.length} transactions for processing`)

  // Process only the transactions THIS cron instance claimed
  const results = []
  for (const tx of claimed) {
    try {
      console.log(`[CRON AUTO-RELEASE] Processing transaction ${tx.id}`)

      // Capture payment in Stripe
      await stripe.paymentIntents.capture(tx.stripe_payment_intent_id)
      console.log(`[CRON AUTO-RELEASE] Captured PI ${tx.stripe_payment_intent_id}`)

      // Update transaction status to 'released'
      const { error: updateError } = await supabaseAdmin
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', tx.id)

      if (updateError) {
        throw new Error(`DB update failed: ${updateError.message}`)
      }

      // Record in audit log
      await writeAuditLog({
        transactionId: tx.id,
        eventType: 'released',
        actor: 'system',
        actorId: 'cron-auto-release',
        statusBefore: 'releasing',
        statusAfter: 'released',
        amountCents: tx.amount_total_cents,
        metadata: {
          reason: 'auto_release_timeout',
          stripe_payment_intent_id: tx.stripe_payment_intent_id,
        },
      })

      results.push({ id: tx.id, success: true })
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error(`[CRON AUTO-RELEASE] Failed for tx ${tx.id}: ${errorMsg}`)

      // If capture failed, revert status back to 'paid' so it can be retried
      try {
        await supabaseAdmin
          .from('escrow_transactions')
          .update({ status: 'paid' })
          .eq('id', tx.id)
        console.log(`[CRON AUTO-RELEASE] Reverted ${tx.id} back to 'paid' for retry`)
      } catch (revertErr) {
        console.error(`[CRON AUTO-RELEASE] Failed to revert ${tx.id}:`, revertErr)
      }

      results.push({ id: tx.id, success: false, error: errorMsg })
    }
  }

  const successCount = results.filter(r => r.success).length
  console.log(`[CRON AUTO-RELEASE] Completed: ${successCount}/${results.length} successful`)

  return NextResponse.json({ processed: results.length, successCount, results })
}
