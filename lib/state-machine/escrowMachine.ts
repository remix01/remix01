import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * ESCROW STATE MACHINE
 * 
 * Valid transitions based on the escrow_transactions status column:
 * pending     → payment created, not yet charged
 * paid        → customer paid, funds held in escrow
 * released    → terminal: partner got paid
 * refunded    → terminal: customer got refund
 * disputed    → spor open, awaiting admin resolution
 * cancelled   → terminal: pre-payment cancellation
 */
const escrowTransitions: Record<string, string[]> = {
  pending: ['paid', 'cancelled'],         // Can be paid or cancelled before payment
  paid: ['released', 'refunded', 'disputed'], // Main escrow flow after payment
  disputed: ['released', 'refunded'],     // Admin resolves dispute to release or refund
  released: [],                            // TERMINAL: no further transitions
  refunded: [],                            // TERMINAL: no further transitions
  cancelled: [],                           // TERMINAL: no further transitions
}

// Terminal states that can NEVER transition
const TERMINAL_STATES = new Set(['released', 'refunded', 'cancelled'])

/**
 * Assert valid escrow state transition
 * 
 * @param escrowId - UUID of escrow_transactions record
 * @param targetStatus - desired new status
 * @throws { code: 409, error: string } if transition is invalid
 * @throws { code: 404, error: string } if escrow not found
 * @throws { code: 500, error: string } if DB error
 */
export async function assertEscrowTransition(escrowId: string, targetStatus: string): Promise<void> {
  // Fetch current escrow status
  const { data: escrow, error } = await supabaseAdmin
    .from('escrow_transactions')
    .select('status')
    .eq('id', escrowId)
    .maybeSingle()

  if (error) {
    console.error('[STATE-MACHINE] DB error fetching escrow:', error)
    throw { code: 500, error: 'Failed to verify escrow state' }
  }

  if (!escrow) {
    throw { code: 404, error: `Escrow ${escrowId} not found` }
  }

  const currentStatus = escrow.status

  // Hard reject if currently in terminal state
  if (TERMINAL_STATES.has(currentStatus)) {
    console.warn(
      `[STATE-MACHINE] Rejected: escrow ${escrowId} in terminal state ${currentStatus}, cannot transition to ${targetStatus}`
    )
    await logRejectedTransition('escrow', escrowId, currentStatus, targetStatus, 'TERMINAL_STATE')
    throw {
      code: 409,
      error: `Cannot transition from terminal state '${currentStatus}'`,
    }
  }

  // Check if target status is valid
  const allowed = escrowTransitions[currentStatus] ?? []
  if (!allowed.includes(targetStatus)) {
    console.warn(
      `[STATE-MACHINE] Rejected: invalid escrow transition ${currentStatus} → ${targetStatus}`
    )
    await logRejectedTransition('escrow', escrowId, currentStatus, targetStatus, 'INVALID_TRANSITION')
    throw {
      code: 409,
      error: `Invalid transition: ${currentStatus} → ${targetStatus}`,
    }
  }

  console.log(`[STATE-MACHINE] Valid escrow transition: ${currentStatus} → ${targetStatus}`)
}

/**
 * Log rejected state transitions for audit trail
 */
async function logRejectedTransition(
  resource: string,
  resourceId: string,
  currentStatus: string,
  targetStatus: string,
  reason: string
): Promise<void> {
  try {
    // Try to log to escrow_audit_log if it's an escrow
    if (resource === 'escrow') {
      await supabaseAdmin.from('escrow_audit_log').insert({
        transaction_id: resourceId,
        event_type: 'transition_rejected',
        actor: 'system',
        actor_id: 'state-machine',
        status_before: currentStatus,
        status_after: targetStatus,
        metadata: { reason },
      })
    }
  } catch (err) {
    console.error(`[STATE-MACHINE] Failed to log rejected transition:`, err)
    // Don't throw - audit logging failure shouldn't block the primary error
  }
}
