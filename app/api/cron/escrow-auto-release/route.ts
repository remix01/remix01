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

      // ========== TRANSACTIONAL CONSISTENCY FIX ==========
      // Capture payment FIRST, then update DB status ONLY on success
      // Never update DB before confirming Stripe success
      
      let stripeSuccess = false
      try {
        // Capture payment in Stripe (must succeed)
        await stripe.paymentIntents.capture(tx.stripe_payment_intent_id)
        stripeSuccess = true
        console.log(`[CRON AUTO-RELEASE] Captured PI ${tx.stripe_payment_intent_id}`)
      } catch (stripeErr: any) {
        console.error(`[CRON AUTO-RELEASE] Stripe capture failed for ${tx.id}: ${stripeErr.message}`)
        // Revert status back to 'paid' so it can be retried on next cron run
        const { error: revertErr } = await supabaseAdmin
          .from('escrow_transactions')
          .update({ status: 'paid' })
          .eq('id', tx.id)
        if (revertErr) {
          console.error(`[CRON AUTO-RELEASE] Failed to revert ${tx.id}: ${revertErr.message}`)
        }
        throw stripeErr
      }

      // ONLY update DB status after Stripe confirms success
      if (!stripeSuccess) {
        throw new Error('Stripe success not confirmed - DB update prevented')
      }

      const { error: updateError } = await supabaseAdmin
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', tx.id)

      if (updateError) {
        console.error(`[CRON AUTO-RELEASE] DB update failed for ${tx.id} after Stripe success: ${updateError.message}`)
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
      results.push({ id: tx.id, success: false, error: errorMsg })
    }
  }

  const successCount = results.filter(r => r.success).length
  console.log(`[CRON AUTO-RELEASE] Completed: ${successCount}/${results.length} successful`)

  return NextResponse.json({ processed: results.length, successCount, results })
}
