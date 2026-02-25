/**
 * STATE MACHINE GUARD - TEST UTILITIES AND EXAMPLES
 * 
 * Example test suite showing how to verify state machine behavior.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { assertTransition } from '@/lib/agent/state-machine'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * TEST SUITE: Escrow State Machine
 */
describe('Escrow State Machine', () => {
  let testEscrowId: string

  beforeEach(async () => {
    // Create a test escrow in 'pending' state
    const { data, error } = await supabaseAdmin
      .from('escrow_transactions')
      .insert({
        status: 'pending',
        amount_total_cents: 10000,
        customer_id: 'test-customer',
        partner_id: 'test-partner',
        stripe_payment_intent_id: 'pi_test_' + Date.now(),
      })
      .select()
      .single()

    if (error) throw error
    testEscrowId = data.id
  })

  afterEach(async () => {
    // Clean up test data
    if (testEscrowId) {
      await supabaseAdmin
        .from('escrow_transactions')
        .delete()
        .eq('id', testEscrowId)
    }
  })

  // ============================================================================
  // VALID TRANSITIONS
  // ============================================================================

  it('should allow pending → paid transition', async () => {
    // Setup: escrow is 'pending'
    expect(
      await assertTransition('escrow', testEscrowId, 'paid')
    ).toBeUndefined() // Success = no throw

    // Verify DB wasn't modified by state check
    const { data } = await supabaseAdmin
      .from('escrow_transactions')
      .select('status')
      .eq('id', testEscrowId)
      .single()

    expect(data.status).toBe('pending') // Still pending - only validated
  })

  it('should allow pending → cancelled transition', async () => {
    await expect(
      assertTransition('escrow', testEscrowId, 'cancelled')
    ).resolves.not.toThrow()
  })

  it('should allow paid → released transition', async () => {
    // Setup: change to 'paid' first
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'paid' })
      .eq('id', testEscrowId)

    // Test: paid → released
    await expect(
      assertTransition('escrow', testEscrowId, 'released')
    ).resolves.not.toThrow()
  })

  it('should allow paid → refunded transition', async () => {
    // Setup: change to 'paid' first
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'paid' })
      .eq('id', testEscrowId)

    // Test: paid → refunded
    await expect(
      assertTransition('escrow', testEscrowId, 'refunded')
    ).resolves.not.toThrow()
  })

  it('should allow paid → disputed transition', async () => {
    // Setup: change to 'paid' first
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'paid' })
      .eq('id', testEscrowId)

    // Test: paid → disputed
    await expect(
      assertTransition('escrow', testEscrowId, 'disputed')
    ).resolves.not.toThrow()
  })

  // ============================================================================
  // INVALID TRANSITIONS
  // ============================================================================

  it('should reject pending → released (invalid transition)', async () => {
    // Setup: escrow is 'pending'

    // Test: pending → released (not allowed)
    await expect(
      assertTransition('escrow', testEscrowId, 'released')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('Invalid transition'),
    })
  })

  it('should reject pending → disputed (invalid transition)', async () => {
    // Setup: escrow is 'pending'

    // Test: pending → disputed (not allowed)
    await expect(
      assertTransition('escrow', testEscrowId, 'disputed')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('Invalid transition'),
    })
  })

  it('should reject pending → refunded (invalid transition)', async () => {
    // Setup: escrow is 'pending'

    // Test: pending → refunded (not allowed)
    await expect(
      assertTransition('escrow', testEscrowId, 'refunded')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('Invalid transition'),
    })
  })

  // ============================================================================
  // TERMINAL STATE PROTECTION
  // ============================================================================

  it('should reject any transition FROM released (terminal state)', async () => {
    // Setup: change to 'released' (terminal)
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'released' })
      .eq('id', testEscrowId)

    // Test: released → anything
    await expect(
      assertTransition('escrow', testEscrowId, 'refunded')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('terminal state'),
    })
  })

  it('should reject any transition FROM refunded (terminal state)', async () => {
    // Setup: change to 'refunded' (terminal)
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'refunded' })
      .eq('id', testEscrowId)

    // Test: refunded → released
    await expect(
      assertTransition('escrow', testEscrowId, 'released')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('terminal state'),
    })
  })

  it('should reject any transition FROM cancelled (terminal state)', async () => {
    // Setup: change to 'cancelled' (terminal)
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'cancelled' })
      .eq('id', testEscrowId)

    // Test: cancelled → paid
    await expect(
      assertTransition('escrow', testEscrowId, 'paid')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('terminal state'),
    })
  })

  // ============================================================================
  // AUDIT LOGGING
  // ============================================================================

  it('should log rejected transitions to audit table', async () => {
    // Attempt invalid transition
    await expect(
      assertTransition('escrow', testEscrowId, 'released')
    ).rejects.toThrow()

    // Verify audit log was created
    const { data: logs } = await supabaseAdmin
      .from('escrow_audit_log')
      .select('*')
      .eq('event_type', 'transition_rejected')
      .eq('transaction_id', testEscrowId)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      transaction_id: testEscrowId,
      event_type: 'transition_rejected',
      actor: 'system',
      actor_id: 'state-machine',
      status_before: 'pending',
      status_after: 'released',
    })
    expect(logs[0].metadata.reason).toBe('INVALID_TRANSITION')
  })

  it('should log terminal state violations', async () => {
    // Setup: make it terminal
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'released' })
      .eq('id', testEscrowId)

    // Attempt transition from terminal state
    await expect(
      assertTransition('escrow', testEscrowId, 'refunded')
    ).rejects.toThrow()

    // Verify audit log reason
    const { data: logs } = await supabaseAdmin
      .from('escrow_audit_log')
      .select('*')
      .eq('event_type', 'transition_rejected')
      .eq('transaction_id', testEscrowId)
      .order('created_at', { ascending: false })
      .limit(1)

    expect(logs[0].metadata.reason).toBe('TERMINAL_STATE')
  })

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  it('should return 404 for non-existent escrow', async () => {
    const fakeId = 'non-existent-' + Date.now()

    await expect(
      assertTransition('escrow', fakeId, 'released')
    ).rejects.toMatchObject({
      code: 404,
      error: expect.stringContaining('not found'),
    })
  })

  it('should throw for invalid target status', async () => {
    // Even though this isn't explicitly rejected, an invalid status
    // won't be in the allowed transitions
    await expect(
      assertTransition('escrow', testEscrowId, 'invalid_status')
    ).rejects.toMatchObject({
      code: 409,
    })
  })
})

/**
 * TEST SUITE: Inquiry State Machine
 */
describe('Inquiry State Machine', () => {
  let testInquiryId: string

  beforeEach(async () => {
    const { data, error } = await supabaseAdmin
      .from('inquiries')
      .insert({
        status: 'pending',
        customer_id: 'test-customer',
        category: 'cleaning',
      })
      .select()
      .single()

    if (error) throw error
    testInquiryId = data.id
  })

  afterEach(async () => {
    if (testInquiryId) {
      await supabaseAdmin
        .from('inquiries')
        .delete()
        .eq('id', testInquiryId)
    }
  })

  it('should allow pending → offer_received transition', async () => {
    await expect(
      assertTransition('inquiry', testInquiryId, 'offer_received')
    ).resolves.not.toThrow()
  })

  it('should allow pending → closed transition', async () => {
    await expect(
      assertTransition('inquiry', testInquiryId, 'closed')
    ).resolves.not.toThrow()
  })

  it('should reject pending → accepted (invalid)', async () => {
    await expect(
      assertTransition('inquiry', testInquiryId, 'accepted')
    ).rejects.toMatchObject({
      code: 409,
    })
  })

  it('should reject transitions from completed (terminal)', async () => {
    // Setup: make it terminal
    await supabaseAdmin
      .from('inquiries')
      .update({ status: 'completed' })
      .eq('id', testInquiryId)

    // Test: can't transition anywhere
    await expect(
      assertTransition('inquiry', testInquiryId, 'closed')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('terminal state'),
    })
  })
})

/**
 * TEST SUITE: Offer State Machine
 */
describe('Offer State Machine', () => {
  let testOfferId: string

  beforeEach(async () => {
    const { data, error } = await supabaseAdmin
      .from('ponudbe')
      .insert({
        status: 'poslana',
        inquiry_id: 'test-inquiry',
        partner_id: 'test-partner',
        price_cents: 5000,
      })
      .select()
      .single()

    if (error) throw error
    testOfferId = data.id
  })

  afterEach(async () => {
    if (testOfferId) {
      await supabaseAdmin
        .from('ponudbe')
        .delete()
        .eq('id', testOfferId)
    }
  })

  it('should allow poslana → sprejeta transition', async () => {
    await expect(
      assertTransition('offer', testOfferId, 'sprejeta')
    ).resolves.not.toThrow()
  })

  it('should allow poslana → zavrnjena transition', async () => {
    await expect(
      assertTransition('offer', testOfferId, 'zavrnjena')
    ).resolves.not.toThrow()
  })

  it('should reject sprejeta → zavrnjena (terminal)', async () => {
    // Setup: accepted offer
    await supabaseAdmin
      .from('ponudbe')
      .update({ status: 'sprejeta' })
      .eq('id', testOfferId)

    // Test: can't transition anywhere
    await expect(
      assertTransition('offer', testOfferId, 'zavrnjena')
    ).rejects.toMatchObject({
      code: 409,
      error: expect.stringContaining('terminal state'),
    })
  })
})

/**
 * TEST SUITE: Integration Tests
 */
describe('State Machine Integration', () => {
  it('should reject unknown resource type', async () => {
    await expect(
      assertTransition('unknown' as any, 'id', 'status')
    ).rejects.toMatchObject({
      code: 400,
      error: expect.stringContaining('Unknown resource type'),
    })
  })

  it('should work with actual API flow', async () => {
    // Create escrow
    const { data: escrow } = await supabaseAdmin
      .from('escrow_transactions')
      .insert({
        status: 'pending',
        amount_total_cents: 10000,
        customer_id: 'customer-1',
        partner_id: 'partner-1',
        stripe_payment_intent_id: 'pi_test_' + Date.now(),
      })
      .select()
      .single()

    // Validate transitions in sequence
    const transitions = [
      { from: 'pending', to: 'paid', shouldSucceed: true },
      { from: 'paid', to: 'released', shouldSucceed: true },
      { from: 'released', to: 'refunded', shouldSucceed: false }, // Terminal
    ]

    // First transition
    await assertTransition('escrow', escrow.id, 'paid')
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'paid' })
      .eq('id', escrow.id)

    // Second transition
    await assertTransition('escrow', escrow.id, 'released')
    await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'released' })
      .eq('id', escrow.id)

    // Third transition (should fail)
    await expect(
      assertTransition('escrow', escrow.id, 'refunded')
    ).rejects.toMatchObject({
      code: 409,
    })

    // Cleanup
    await supabaseAdmin
      .from('escrow_transactions')
      .delete()
      .eq('id', escrow.id)
  })
})
