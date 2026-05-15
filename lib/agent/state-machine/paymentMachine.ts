import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  PaymentStatus,
  PAYMENT_TRANSITIONS,
  PAYMENT_TERMINAL,
  PAYMENT_STATUS_MIGRATION,
} from '@/lib/state-machine/statuses'
import { assertTransitionValid, TransitionError } from '@/lib/state-machine/transition'

/**
 * PAYMENT STATE MACHINE
 *
 * Governs `escrow_transactions.status` using the canonical PaymentStatus enum.
 * Adds a typed layer on top of the existing escrow state machine while
 * remaining backward-compatible with current DB values via PAYMENT_STATUS_MIGRATION.
 *
 * pending → authorized → captured → reconciled (TERMINAL)
 *                     ↘ refunded (TERMINAL)
 *                     ↘ disputed → captured | refunded
 */
export async function assertPaymentTransition(
  transactionId: string,
  targetStatus: string,
): Promise<{ from: PaymentStatus; to: PaymentStatus }> {
  const { data: row, error } = await supabaseAdmin
    .from('escrow_transactions')
    .select('status')
    .eq('id', transactionId)
    .maybeSingle()

  if (error) {
    console.error('[STATE-MACHINE] DB error fetching payment:', error)
    throw { code: 500, error: 'Failed to verify payment state' }
  }

  if (!row) {
    throw { code: 404, error: `Payment transaction ${transactionId} not found` }
  }

  const rawStatus = row.status as string
  const currentStatus = (PAYMENT_STATUS_MIGRATION[rawStatus] ?? rawStatus) as PaymentStatus
  const target = (PAYMENT_STATUS_MIGRATION[targetStatus] ?? targetStatus) as PaymentStatus

  try {
    assertTransitionValid(currentStatus, target, PAYMENT_TRANSITIONS, PAYMENT_TERMINAL)
  } catch (err) {
    if (err instanceof TransitionError) {
      console.warn(
        `[STATE-MACHINE] Rejected: payment ${transactionId} transition ${currentStatus} → ${target} (${err.reason})`,
      )
      await logRejectedTransition(transactionId, currentStatus, target, err.reason)
      throw { code: err.code, error: err.message }
    }
    throw err
  }

  console.log(`[STATE-MACHINE] Valid payment transition: ${currentStatus} → ${target}`)
  return { from: currentStatus, to: target }
}

async function logRejectedTransition(
  transactionId: string,
  currentStatus: string,
  targetStatus: string,
  reason: string,
): Promise<void> {
  try {
    await supabaseAdmin.from('escrow_audit_log').insert({
      transaction_id: transactionId,
      event_type: 'transition_rejected',
      actor: 'system',
      actor_id: 'state-machine',
      status_before: currentStatus,
      status_after: targetStatus,
      metadata: { reason, resource: 'payment' },
    })
  } catch (err) {
    console.error('[STATE-MACHINE] Failed to log rejected payment transition:', err)
  }
}
