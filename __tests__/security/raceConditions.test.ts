import { MessageBus } from '@/lib/agents/base/MessageBus'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { testDb } from '../integration/helpers/testDb'

describe('Race Conditions', () => {
  beforeEach(async () => {
    await testDb.reset()
  })

  it('concurrent captureEscrow calls — only one succeeds', async () => {
    const escrowId = 'test-escrow'
    const userId = 'test-user'
    const sessionId = 'test-session'

    await supabaseAdmin.from('escrows').insert({
      id: escrowId,
      status: 'active',
      amount: 1000,
    })

    const results = await Promise.all([
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'captureEscrow',
        params: { escrowId, userId, sessionId },
      }),
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'captureEscrow',
        params: { escrowId, userId, sessionId },
      }),
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'captureEscrow',
        params: { escrowId, userId, sessionId },
      }),
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'captureEscrow',
        params: { escrowId, userId, sessionId },
      }),
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'captureEscrow',
        params: { escrowId, userId, sessionId },
      }),
    ])

    const successCount = results.filter(r => r.success).length
    const conflictCount = results.filter(r => r.statusCode === 409).length

    expect(successCount).toBe(1)
    expect(conflictCount).toBe(4)

    const dbEscrow = await testDb.getEscrow(escrowId)
    expect(dbEscrow.status).toBe('captured')
  })

  it('concurrent releaseEscrow calls — only one succeeds', async () => {
    const escrowId = 'test-escrow'
    const userId = 'test-user'
    const sessionId = 'test-session'

    await supabaseAdmin.from('escrows').insert({
      id: escrowId,
      status: 'captured',
      amount: 1000,
    })

    const results = await Promise.all([
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'releaseEscrow',
        params: { escrowId, userId, sessionId },
      }),
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'releaseEscrow',
        params: { escrowId, userId, sessionId },
      }),
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'releaseEscrow',
        params: { escrowId, userId, sessionId },
      }),
    ])

    const successCount = results.filter(r => r.success).length
    const conflictCount = results.filter(r => r.statusCode === 409).length

    expect(successCount).toBe(1)
    expect(conflictCount).toBe(2)

    const dbEscrow = await testDb.getEscrow(escrowId)
    expect(dbEscrow.status).toBe('released')
  })

  it('concurrent offer acceptance — only one accepted', async () => {
    const offerId = 'test-offer'
    const inquiryId = 'test-inquiry'
    const userId = 'test-user'
    const sessionId = 'test-session'

    await supabaseAdmin.from('offers').insert({
      id: offerId,
      inquiry_id: inquiryId,
      status: 'pending',
    })

    const results = await Promise.all([
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'acceptOffer',
        params: { offerId, userId, sessionId },
      }),
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'acceptOffer',
        params: { offerId, userId, sessionId },
      }),
      MessageBus.send({
        from: 'orchestrator',
        to: 'escrow',
        action: 'acceptOffer',
        params: { offerId, userId, sessionId },
      }),
    ])

    const successCount = results.filter(r => r.success).length
    const conflictCount = results.filter(r => r.statusCode === 409).length

    expect(successCount).toBe(1)
    expect(conflictCount).toBe(2)

    const dbOffer = await testDb.getOffer(offerId)
    expect(dbOffer.status).toBe('accepted')
  })

  it('DB transaction prevents dirty reads during state transition', async () => {
    const escrowId = 'test-escrow'
    const userId = 'test-user'
    const sessionId = 'test-session'

    await supabaseAdmin.from('escrows').insert({
      id: escrowId,
      status: 'pending',
      amount: 1000,
    })

    let midTransitionState: string | null = null

    const updatePromise = MessageBus.send({
      from: 'orchestrator',
      to: 'escrow',
      action: 'captureEscrow',
      params: { escrowId, userId, sessionId },
    })

    // Attempt concurrent read during transition
    await new Promise(resolve => setTimeout(resolve, 10))
    const midRead = await testDb.getEscrow(escrowId)
    midTransitionState = midRead.status

    await updatePromise

    const finalState = await testDb.getEscrow(escrowId)

    // State should be either old (pending) or new (captured), never partial
    expect([escrowId, 'captured']).toContain(midTransitionState)
    expect(finalState.status).toBe('captured')
  })
})
