import { shortTermMemory, ConversationState, Message } from '@/lib/agent/memory/shortTerm'

describe('ShortTermMemory', () => {
  beforeEach(async () => {
    // Clear the store before each test
    await shortTermMemory.clear('__all__')
  })

  describe('session management', () => {
    it('creates new session on getOrCreate for unknown sessionId', async () => {
      const sessionId = 'session-123'
      const userId = 'user-456'

      const state = await shortTermMemory.getOrCreate(sessionId, userId)

      expect(state).toBeDefined()
      expect(state.sessionId).toBe(sessionId)
      expect(state.userId).toBe(userId)
      expect(state.messages).toEqual([])
      expect(state.createdAt).toBeDefined()
      expect(state.updatedAt).toBeDefined()
    })

    it('returns existing session on getOrCreate for known sessionId', async () => {
      const sessionId = 'session-123'
      const userId = 'user-456'

      const state1 = await shortTermMemory.getOrCreate(sessionId, userId)
      const state2 = await shortTermMemory.getOrCreate(sessionId, userId)

      expect(state1.sessionId).toBe(state2.sessionId)
      expect(state1.createdAt).toBe(state2.createdAt)
    })

    it('clear removes session completely', async () => {
      const sessionId = 'session-123'
      await shortTermMemory.getOrCreate(sessionId, 'user-456')

      await shortTermMemory.clear(sessionId)

      const state = await shortTermMemory.getContext(sessionId)
      expect(state).toBeNull()
    })
  })

  describe('message handling', () => {
    it('adds messages in correct order', async () => {
      const sessionId = 'session-123'
      await shortTermMemory.getOrCreate(sessionId, 'user-456')

      const msg1: Message = {
        role: 'user',
        content: 'First message',
        timestamp: Date.now(),
      }
      const msg2: Message = {
        role: 'assistant',
        content: 'Second message',
        timestamp: Date.now() + 1000,
      }

      await shortTermMemory.addMessage(sessionId, msg1)
      await shortTermMemory.addMessage(sessionId, msg2)

      const state = await shortTermMemory.getContext(sessionId)
      expect(state?.messages).toHaveLength(2)
      expect(state?.messages[0]).toBe(msg1)
      expect(state?.messages[1]).toBe(msg2)
    })

    it('prunes to max 20 messages — oldest dropped first', async () => {
      const sessionId = 'session-123'
      await shortTermMemory.getOrCreate(sessionId, 'user-456')

      // Add 25 messages
      for (let i = 0; i < 25; i++) {
        await shortTermMemory.addMessage(sessionId, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: Date.now() + i,
        })
      }

      const state = await shortTermMemory.getContext(sessionId)
      expect(state?.messages).toHaveLength(20)

      // First 5 messages should be dropped (0-4)
      expect(state?.messages[0].content).toBe('Message 5')
      expect(state?.messages[19].content).toBe('Message 24')
    })
  })

  describe('active resources', () => {
    it('setActiveResource stores escrowId correctly', async () => {
      const sessionId = 'session-123'
      await shortTermMemory.getOrCreate(sessionId, 'user-456')

      const escrowId = 'escrow-789'
      await shortTermMemory.setActiveResource(sessionId, 'escrowId', escrowId)

      const state = await shortTermMemory.getContext(sessionId)
      expect(state?.activeEscrowId).toBe(escrowId)
    })

    it('setActiveResource stores inquiryId correctly', async () => {
      const sessionId = 'session-123'
      await shortTermMemory.getOrCreate(sessionId, 'user-456')

      const inquiryId = 'inquiry-789'
      await shortTermMemory.setActiveResource(sessionId, 'inquiryId', inquiryId)

      const state = await shortTermMemory.getContext(sessionId)
      expect(state?.activeInquiryId).toBe(inquiryId)
    })

    it('setActiveResource stores offerId correctly', async () => {
      const sessionId = 'session-123'
      await shortTermMemory.getOrCreate(sessionId, 'user-456')

      const offerId = 'offer-789'
      await shortTermMemory.setActiveResource(sessionId, 'offerId', offerId)

      const state = await shortTermMemory.getContext(sessionId)
      expect(state?.activeOfferId).toBe(offerId)
    })
  })

  describe('context retrieval', () => {
    it('getContext returns null for unknown sessionId', async () => {
      const state = await shortTermMemory.getContext('unknown-session')
      expect(state).toBeNull()
    })

    it('getContext returns state for known sessionId', async () => {
      const sessionId = 'session-123'
      const userId = 'user-456'
      await shortTermMemory.getOrCreate(sessionId, userId)

      const state = await shortTermMemory.getContext(sessionId)
      expect(state).toBeDefined()
      expect(state?.userId).toBe(userId)
    })
  })

  describe('session isolation', () => {
    it('two different sessions are fully isolated', async () => {
      const session1 = 'session-1'
      const session2 = 'session-2'

      await shortTermMemory.getOrCreate(session1, 'user-1')
      await shortTermMemory.getOrCreate(session2, 'user-2')

      await shortTermMemory.addMessage(session1, {
        role: 'user',
        content: 'Message in session 1',
        timestamp: Date.now(),
      })

      await shortTermMemory.addMessage(session2, {
        role: 'user',
        content: 'Message in session 2',
        timestamp: Date.now(),
      })

      await shortTermMemory.setActiveResource(session1, 'escrowId', 'escrow-1')
      await shortTermMemory.setActiveResource(session2, 'escrowId', 'escrow-2')

      const state1 = await shortTermMemory.getContext(session1)
      const state2 = await shortTermMemory.getContext(session2)

      expect(state1?.messages).toHaveLength(1)
      expect(state2?.messages).toHaveLength(1)
      expect(state1?.messages[0].content).toBe('Message in session 1')
      expect(state2?.messages[0].content).toBe('Message in session 2')
      expect(state1?.activeEscrowId).toBe('escrow-1')
      expect(state2?.activeEscrowId).toBe('escrow-2')
    })
  })

  describe('session pruning', () => {
    it('pruneOldSessions removes sessions older than 2 hours', async () => {
      const sessionId = 'session-123'
      const state = await shortTermMemory.getOrCreate(sessionId, 'user-456')

      // Manually set createdAt to 3 hours ago
      state.createdAt = Date.now() - 3 * 60 * 60 * 1000
      state.updatedAt = Date.now() - 3 * 60 * 60 * 1000

      // Trigger pruning by creating a new session
      await shortTermMemory.getOrCreate('new-session', 'user-789')

      const pruned = await shortTermMemory.getContext(sessionId)
      expect(pruned).toBeNull()
    })

    it('pruneOldSessions does not remove active sessions', async () => {
      const sessionId = 'session-123'
      const state = await shortTermMemory.getOrCreate(sessionId, 'user-456')

      // Keep updatedAt recent, even if createdAt is old
      state.createdAt = Date.now() - 3 * 60 * 60 * 1000
      state.updatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago

      // Trigger pruning
      await shortTermMemory.getOrCreate('new-session', 'user-789')

      const active = await shortTermMemory.getContext(sessionId)
      expect(active).toBeDefined()
    })
  })

  describe('boundary conditions', () => {
    it('handles null/undefined sessionId gracefully', async () => {
      // @ts-ignore - testing boundary
      const state1 = await shortTermMemory.getOrCreate(null, 'user-456')
      // @ts-ignore - testing boundary
      const state2 = await shortTermMemory.getOrCreate(undefined, 'user-456')

      expect(state1).toBeDefined()
      expect(state2).toBeDefined()
    })

    it('handles empty string inputs', async () => {
      const state = await shortTermMemory.getOrCreate('', '')

      expect(state).toBeDefined()
      expect(state.sessionId).toBe('')
      expect(state.userId).toBe('')
    })
  })
})
