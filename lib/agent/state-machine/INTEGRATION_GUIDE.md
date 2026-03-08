/**
 * STATE MACHINE GUARD INTEGRATION GUIDE
 * 
 * This document explains how to use the State Machine Guard layer to enforce
 * valid state transitions for escrow, inquiry, and offer entities.
 * 
 * KEY PRINCIPLES:
 * ✅ No transition is allowed unless explicitly defined
 * ✅ Terminal states NEVER allow further transitions (hard reject)
 * ✅ State guard runs AFTER Permission Layer, BEFORE DB writes
 * ✅ Every rejected transition is logged to audit table
 * ✅ State guard can run inside DB transactions for atomicity
 */

/**
 * BASIC USAGE PATTERN
 * 
 * Import the state machine guard and call it before updating entity status:
 */
import { assertTransition } from '@/lib/agent/state-machine'

export async function transitionExample() {
  // Get the resource ID and target status from user input
  const { escrowId, targetStatus } = await request.json()

  try {
    // 1. VALIDATE STATE TRANSITION (runs BEFORE DB write)
    // This throws { code: 409, error: "..." } if transition is invalid
    await assertTransition('escrow', escrowId, targetStatus)

    // 2. If we reach here, transition is valid
    // Safe to update the DB now
    const { data: updated, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: targetStatus })
      .eq('id', escrowId)
      .select()
      .single()

    if (error) throw error

    // 3. Continue with other operations...
    return success(updated)
  } catch (err) {
    if (err.code === 409) {
      return conflict(err.error) // Invalid state transition
    }
    if (err.code === 404) {
      return notFound(err.error) // Resource not found
    }
    return internalError()
  }
}

/**
 * RESOURCE TYPES
 * 
 * The state machine guard supports three resource types:
 */

// ESCROW TRANSITIONS
// pending   → [paid, cancelled]
// paid      → [released, refunded, disputed]
// disputed  → [released, refunded]
// released  → [] (TERMINAL)
// refunded  → [] (TERMINAL)
// cancelled → [] (TERMINAL)
await assertTransition('escrow', escrowId, 'released')

// INQUIRY TRANSITIONS
// pending        → [offer_received, closed]
// offer_received → [accepted, pending]
// accepted       → [completed, closed]
// completed      → [] (TERMINAL)
// closed         → [] (TERMINAL)
await assertTransition('inquiry', inquiryId, 'completed')

// OFFER TRANSITIONS
// poslana   → [sprejeta, zavrnjena]
// sprejeta  → [] (TERMINAL)
// zavrnjena → [] (TERMINAL)
await assertTransition('offer', offerId, 'sprejeta')

/**
 * ERROR HANDLING
 * 
 * The guard throws errors with standardized codes:
 */
try {
  await assertTransition('escrow', escrowId, 'invalid_status')
} catch (err) {
  if (err.code === 400) {
    // Unknown resource type
    console.error('Invalid resource type')
  } else if (err.code === 404) {
    // Resource not found
    console.error('Escrow not found:', escrowId)
  } else if (err.code === 409) {
    // Invalid transition or terminal state violation
    console.error('Cannot transition:', err.error)
  } else if (err.code === 500) {
    // Database error during state check
    console.error('Database error:', err.error)
  }
}

/**
 * AUDIT LOGGING
 * 
 * Every rejected transition is automatically logged to the audit table:
 * - Reason: TERMINAL_STATE (attempted to transition from terminal)
 * - Reason: INVALID_TRANSITION (transition not allowed in this state)
 * 
 * Admin can query rejected transitions:
 */
SELECT * FROM escrow_audit_log
WHERE event_type = 'transition_rejected'
ORDER BY created_at DESC

/**
 * TRANSACTIONAL PATTERN
 * 
 * Combine the state guard with DB transactions for atomic operations:
 */
export async function atomicTransitionExample() {
  const { escrowId, targetStatus } = await request.json()

  // 1. Validate transition BEFORE transaction
  await assertTransition('escrow', escrowId, targetStatus)

  // 2. Now update in transaction (safe because transition is valid)
  const { data: escrow, error } = await supabaseAdmin
    .from('escrow_transactions')
    .update({
      status: targetStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', escrowId)
    .select()
    .single()

  if (error) throw error

  // 3. After DB commits, enqueue any async operations
  // (Stripe calls, emails, etc.)
  await enqueue('processEscrow', { escrowId, newStatus: targetStatus })

  return success(escrow)
}

/**
 * PERMISSION + STATE MACHINE LAYER
 * 
 * The state machine guard runs AFTER permission checks.
 * Typical flow:
 * 
 * 1. API Route Handler
 * 2. ↓ Session/Auth check
 * 3. ↓ Permission Layer (role + ownership)
 * 4. ↓ INPUT VALIDATION
 * 5. ↓ State Machine Guard ← You are here
 * 6. ↓ Database Transaction
 * 7. ↓ Async Jobs (Stripe, emails, etc.)
 */

/**
 * MIGRATION CHECKLIST
 * 
 * For each route that modifies entity status:
 * 
 * [ ] Import assertTransition from '@/lib/agent/state-machine'
 * [ ] Add assertTransition call BEFORE DB update
 * [ ] Wrap DB update in try/catch to handle 409 conflicts
 * [ ] Test that invalid transitions throw 409 errors
 * [ ] Test that terminal states cannot transition further
 * [ ] Verify audit logs capture all rejected transitions
 * [ ] Document state flow in your route comments
 */

/**
 * INTEGRATION WITH EXISTING ROUTES
 * 
 * Example: Update /api/escrow/release to use state machine guard
 */

import { NextRequest, NextResponse } from 'next/server'
import { assertTransition } from '@/lib/agent/state-machine'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(request: NextRequest) {
  try {
    const { escrowId } = await request.json()

    // ✅ NEW: Validate state transition BEFORE DB operations
    await assertTransition('escrow', escrowId, 'released')

    // ✅ Safe to update now - transition was validated
    const { data: escrow, error } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, escrow })
  } catch (err: any) {
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
 * TESTING STATE TRANSITIONS
 * 
 * Example test cases to ensure state machine works correctly:
 */

import { describe, it, expect } from '@jest/globals'
import { assertTransition } from '@/lib/agent/state-machine'

describe('State Machine Guard', () => {
  it('should allow valid transitions', async () => {
    // escrow in 'paid' state can transition to 'released'
    await expect(
      assertTransition('escrow', validEscrowId, 'released')
    ).resolves.not.toThrow()
  })

  it('should reject invalid transitions', async () => {
    // escrow in 'pending' state cannot directly transition to 'released'
    await expect(
      assertTransition('escrow', pendingEscrowId, 'released')
    ).rejects.toMatchObject({ code: 409 })
  })

  it('should reject transitions from terminal states', async () => {
    // escrow in 'released' (terminal) cannot transition anywhere
    await expect(
      assertTransition('escrow', releasedEscrowId, 'refunded')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('terminal state'),
    })
  })

  it('should log rejected transitions', async () => {
    await expect(
      assertTransition('escrow', releasedEscrowId, 'refunded')
    ).rejects.toThrow()

    // Verify audit log was created
    const { data: logs } = await supabaseAdmin
      .from('escrow_audit_log')
      .select('*')
      .eq('event_type', 'transition_rejected')
      .eq('transaction_id', releasedEscrowId)

    expect(logs).toHaveLength(1)
    expect(logs[0].metadata.reason).toBe('TERMINAL_STATE')
  })
})

/**
 * BACKWARD COMPATIBILITY
 * 
 * If you have existing code importing from /lib/state-machine/:
 * - Old path: import { assertTransition } from '@/lib/state-machine'
 * - New path: import { assertTransition } from '@/lib/agent/state-machine'
 * 
 * Both work! The old path is re-exported from new location for compatibility.
 * Update your imports to the new path when refactoring.
 */
