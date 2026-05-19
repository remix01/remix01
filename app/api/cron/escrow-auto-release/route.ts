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

  // ========== RECOVERY: Unstick 'releasing' records older than 10 minutes ==========
  // These are leftover from prior runs where Stripe succeeded but DB update failed
  const stuckCutoff = new Date(Date.now() - 10 * 60 * 1000).toISOString()
  const { data: stuck } = await supabaseAdmin
    .from('escrow_transactions')
    .select('id, stripe_payment_intent_id')
    .eq('status', 'releasing')
    .lt('updated_at', stuckCutoff)
    .limit(10)

  for (const tx of stuck ?? []) {
    try {
      const pi = await stripe.paymentIntents.retrieve(tx.stripe_payment_intent_id)
      if (pi.status === 'succeeded') {
        await supabaseAdmin
          .from('escrow_transactions')
          .update({ status: 'released', released_at: new Date().toISOString() })
          .eq('id', tx.id)
          .eq('status', 'releasing')
        console.info(`[CRON RECOVERY] Finalized stuck escrow ${tx.id} — PI already captured`)
      } else if (pi.status === 'requires_capture') {
        await supabaseAdmin
          .from('escrow_transactions')
          .update({ status: 'paid' })
          .eq('id', tx.id)
          .eq('status', 'releasing')
        console.info(`[CRON RECOVERY] Reverted stuck escrow ${tx.id} — PI still requires capture`)
      } else {
        console.error(`[CRON RECOVERY] Stuck escrow ${tx.id} has terminal PI status '${pi.status}' — manual intervention required`)
      }
    } catch (err) {
      console.error(`[CRON RECOVERY] Failed to recover stuck escrow ${tx.id}:`, err)
    }
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
  const results: { id: string; success: boolean; error?: string }[] = []
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

        const TERMINAL_PI_STATUSES = new Set(['canceled', 'requires_payment_method', 'requires_confirmation', 'processing'])
        if (stripeErr.code === 'payment_intent_unexpected_state') {
          const pi = await stripe.paymentIntents.retrieve(tx.stripe_payment_intent_id)
          if (TERMINAL_PI_STATUSES.has(pi.status)) {
            await supabaseAdmin
              .from('escrow_transactions')
              .update({ status: 'cancelled', notes: `PI terminal: ${pi.status}` })
              .eq('id', tx.id)
              .eq('status', 'releasing')
            console.error(`[CRON AUTO-RELEASE] Escrow ${tx.id} cancelled — PI in terminal state '${pi.status}' — manual intervention required`, {
              paymentIntent: tx.stripe_payment_intent_id,
            })
            throw stripeErr
          }
        }

        // Transient failure or PI still requires_capture — revert for retry
        const { error: revertErr } = await supabaseAdmin
          .from('escrow_transactions')
          .update({ status: 'paid' })
          .eq('id', tx.id)
          .eq('status', 'releasing')
        if (revertErr) {
          console.error(`[CRON AUTO-RELEASE] Failed to revert ${tx.id}: ${revertErr.message}`)
        }
        throw stripeErr
      }

      // ONLY update DB status after Stripe confirms success
      if (!stripeSuccess) {
        throw new Error('Stripe success not confirmed - DB update prevented')
      }

      const { data: released, error: updateError } = await supabaseAdmin
        .from('escrow_transactions')
        .update({
          status: 'released',
          released_at: new Date().toISOString(),
        })
        .eq('id', tx.id)
        .eq('status', 'releasing')
        .select('id')

      if (updateError || !released || released.length === 0) {
        console.error(`[CRON AUTO-RELEASE] DB update failed for ${tx.id} after Stripe capture — attempting refund`, {
          updateError,
        })
        try {
          await stripe.refunds.create({
            payment_intent: tx.stripe_payment_intent_id,
          }, {
            idempotencyKey: `escrow-release-refund:${tx.id}`,
          })
          await supabaseAdmin
            .from('escrow_transactions')
            .update({ status: 'refunded' })
            .eq('id', tx.id)
            .eq('status', 'releasing')
          console.warn(`[CRON AUTO-RELEASE] Refunded PI ${tx.stripe_payment_intent_id} after DB failure — marked as refunded`)
        } catch (refundErr) {
          console.error(`[CRON AUTO-RELEASE] CRITICAL: Refund also failed for ${tx.id} — manual intervention required`, {
            paymentIntent: tx.stripe_payment_intent_id,
            refundErr,
          })
        }
        throw new Error(`DB update failed after Stripe capture: ${updateError?.message ?? 'no rows updated'}`)
      }

      // Record in audit log
      await writeAuditLog({
        transactionId: tx.id,
        eventType: 'released',
        actor: 'system',
        actorId: 'cron-auto-release',
        statusBefore: 'releasing' as any,
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
