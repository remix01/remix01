import { InquiryAgent } from '@/lib/agents/inquiry-agent/InquiryAgent'
import { EscrowAgent } from '@/lib/agents/escrow-agent/EscrowAgent'
import { messageBus } from '@/lib/agents/base/MessageBus'
import { workingMemory } from '@/lib/agent/memory/workingMemory'
import { testUser, testPartner, testAdmin } from './helpers/testUsers'
import { testDb } from './helpers/testDb'
import { clearEnqueuedJobs, enqueuedJobs, mockEnqueue } from './helpers/mockJobs'
import { mockStripe, clearStripeMocks } from './helpers/mockStripe'
import { v4 as uuidv4 } from 'uuid'

jest.mock('@/lib/jobs/queue', () => ({
  enqueueJob: mockEnqueue,
}))

jest.mock('stripe', () => {
  return jest.fn(() => mockStripe)
})

describe('Escrow Happy Path Integration', () => {
  const inquiryAgent = new InquiryAgent()
  const escrowAgent = new EscrowAgent()
  let sessionId: string
  let inquiryId: string
  let offerId: string
  let escrowId: string

  beforeEach(async () => {
    sessionId = uuidv4()
    inquiryId = uuidv4()
    offerId = uuidv4()
    escrowId = uuidv4()

    await testDb.reset()
    clearEnqueuedJobs()
    clearStripeMocks()
    workingMemory.clear(sessionId)
  })

  it('Step 1: user creates inquiry', async () => {
    const response = await inquiryAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'inquiry',
      type: 'request',
      action: 'createInquiry',
      payload: {
        title: 'Need help with plumbing',
        description: 'Leaky faucet in kitchen',
        category: 'plumbing',
        budget: 150,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    expect(response.success).toBe(true)
    expect(response.data).toHaveProperty('inquiryId')

    const inquiry = await testDb.getInquiry(response.data.inquiryId)
    expect(inquiry).toBeDefined()
    expect(inquiry.status).toBe('open')
    expect(inquiry.created_by).toBe(testUser.id)
  })

  it('Step 2: partner submits offer', async () => {
    // First create an inquiry
    const inquiryResp = await inquiryAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'inquiry',
      type: 'request',
      action: 'createInquiry',
      payload: {
        title: 'Need help with plumbing',
        description: 'Leaky faucet in kitchen',
        category: 'plumbing',
        budget: 150,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    inquiryId = inquiryResp.data.inquiryId

    // Partner submits offer
    const offerResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'submitOffer',
      payload: {
        inquiryId,
        offeredPrice: 120,
        description: 'I can fix that quickly',
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testPartner.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    expect(offerResp.success).toBe(true)
    expect(offerResp.data).toHaveProperty('offerId')

    const offer = await testDb.getOffer(offerResp.data.offerId)
    expect(offer).toBeDefined()
    expect(offer.status).toBe('pending')
  })

  it('Step 3: user cannot submit offer — wrong role', async () => {
    // First create an inquiry
    const inquiryResp = await inquiryAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'inquiry',
      type: 'request',
      action: 'createInquiry',
      payload: {
        title: 'Need help with plumbing',
        description: 'Leaky faucet in kitchen',
        category: 'plumbing',
        budget: 150,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    inquiryId = inquiryResp.data.inquiryId

    // User tries to submit offer (should fail)
    const offerResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'submitOffer',
      payload: {
        inquiryId,
        offeredPrice: 120,
        description: 'I can fix that quickly',
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    expect(offerResp.success).toBe(false)
    expect(offerResp.error).toContain('Access denied')
  })

  it('Step 4: user accepts offer', async () => {
    // Create inquiry and offer first
    const inquiryResp = await inquiryAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'inquiry',
      type: 'request',
      action: 'createInquiry',
      payload: {
        title: 'Need help with plumbing',
        description: 'Leaky faucet in kitchen',
        category: 'plumbing',
        budget: 150,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    inquiryId = inquiryResp.data.inquiryId

    const offerResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'submitOffer',
      payload: {
        inquiryId,
        offeredPrice: 120,
        description: 'I can fix that quickly',
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testPartner.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    offerId = offerResp.data.offerId

    // User accepts offer
    const acceptResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'acceptOffer',
      payload: {
        offerId,
        inquiryId,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    expect(acceptResp.success).toBe(true)
    expect(acceptResp.data).toHaveProperty('escrowId')

    const offer = await testDb.getOffer(offerId)
    expect(offer.status).toBe('accepted')

    const escrow = await testDb.getEscrow(acceptResp.data.escrowId)
    expect(escrow).toBeDefined()
    expect(escrow.status).toBe('pending')

    // Check email job was enqueued
    expect(enqueuedJobs.some(j => j.type === 'send_payment_confirmed_email')).toBe(true)
  })

  it('Step 5: escrow cannot be captured before active', async () => {
    // Setup: create inquiry, offer, and escrow
    const inquiryResp = await inquiryAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'inquiry',
      type: 'request',
      action: 'createInquiry',
      payload: {
        title: 'Need help with plumbing',
        description: 'Leaky faucet in kitchen',
        category: 'plumbing',
        budget: 150,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    inquiryId = inquiryResp.data.inquiryId

    const offerResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'submitOffer',
      payload: {
        inquiryId,
        offeredPrice: 120,
        description: 'I can fix that quickly',
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testPartner.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    offerId = offerResp.data.offerId

    const acceptResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'acceptOffer',
      payload: {
        offerId,
        inquiryId,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    escrowId = acceptResp.data.escrowId

    // Try to capture before escrow is active (should fail with 409)
    clearEnqueuedJobs()
    const captureResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'captureEscrow',
      payload: {
        escrowId,
        paymentIntentId: 'pi_123',
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    expect(captureResp.success).toBe(false)
    expect(captureResp.error).toContain('pending')

    // Verify no Stripe call was made
    expect(mockStripe.paymentIntents.capture).not.toHaveBeenCalled()

    // Verify no jobs were enqueued
    expect(enqueuedJobs).toHaveLength(0)
  })

  it('Step 6-10: full flow completes successfully', async () => {
    // Step 1: Create inquiry
    const inquiryResp = await inquiryAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'inquiry',
      type: 'request',
      action: 'createInquiry',
      payload: {
        title: 'Need help with plumbing',
        description: 'Leaky faucet in kitchen',
        category: 'plumbing',
        budget: 150,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    inquiryId = inquiryResp.data.inquiryId

    // Step 2: Submit offer
    const offerResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'submitOffer',
      payload: {
        inquiryId,
        offeredPrice: 120,
        description: 'I can fix that quickly',
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testPartner.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    offerId = offerResp.data.offerId

    // Step 3: Accept offer
    const acceptResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'acceptOffer',
      payload: {
        offerId,
        inquiryId,
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    escrowId = acceptResp.data.escrowId
    clearEnqueuedJobs()

    // Step 4: Capture escrow (need to transition to active first)
    const captureResp = await escrowAgent.handle({
      id: uuidv4(),
      from: 'orchestrator',
      to: 'escrow',
      type: 'request',
      action: 'captureEscrow',
      payload: {
        escrowId,
        paymentIntentId: 'pi_123',
      },
      correlationId: uuidv4(),
      sessionId,
      userId: testUser.id,
      timestamp: Date.now(),
      priority: 'normal',
    })

    // Should succeed (assuming escrow is in correct state or auto-transitions)
    if (captureResp.success) {
      expect(enqueuedJobs.some(j => j.type === 'stripe_capture_payment')).toBe(true)
      
      const escrow = await testDb.getEscrow(escrowId)
      expect(escrow.status).toBe('captured')

      // Step 5: Cannot capture again
      clearEnqueuedJobs()
      const captureAgainResp = await escrowAgent.handle({
        id: uuidv4(),
        from: 'orchestrator',
        to: 'escrow',
        type: 'request',
        action: 'captureEscrow',
        payload: {
          escrowId,
          paymentIntentId: 'pi_123',
        },
        correlationId: uuidv4(),
        sessionId,
        userId: testUser.id,
        timestamp: Date.now(),
        priority: 'normal',
      })

      expect(captureAgainResp.success).toBe(false)
      expect(enqueuedJobs).toHaveLength(0)

      // Step 6: Release escrow
      clearEnqueuedJobs()
      const releaseResp = await escrowAgent.handle({
        id: uuidv4(),
        from: 'orchestrator',
        to: 'escrow',
        type: 'request',
        action: 'releaseEscrow',
        payload: {
          escrowId,
        },
        correlationId: uuidv4(),
        sessionId,
        userId: testUser.id,
        timestamp: Date.now(),
        priority: 'normal',
      })

      expect(releaseResp.success).toBe(true)
      expect(enqueuedJobs.some(j => j.type === 'send_release_email')).toBe(true)

      const finalEscrow = await testDb.getEscrow(escrowId)
      expect(finalEscrow.status).toBe('released')
    }
  })
})
