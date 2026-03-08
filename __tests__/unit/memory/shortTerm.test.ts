import { shortTermMemory, ConversationState, Message } from '@/lib/agent/memory/shortTerm'

describe('ShortTermMemory', () => {
  beforeEach(() => {
    // Clear the store before each test
    shortTermMemory.clear()
  })

  describe('session management', () => {
    it('creates new session on getOrCreate for unknown sessionId', () => {
      const sessionId = 'session-123'
      const userId = 'user-456'

      const state = shortTermMemory.getOrCreate(sessionId, userId)

      expect(state).toBeDefined()
      expect(state.sessionId).toBe(sessionId)
      expect(state.userId).toBe(userId)
      expect(state.messages).toEqual([])
      expect(state.createdAt).toBeDefined()
      expect(state.updatedAt).toBeDefined()
    })

    it('returns existing session on getOrCreate for known sessionId', () => {
      const sessionId = 'session-123'
      const userId = 'user-456'

      const state1 = shortTermMemory.getOrCreate(sessionId, userId)
      const state2 = shortTermMemory.getOrCreate(sessionId, userId)

      expect(state1).toBe(state2)
      expect(state1.createdAt).toBe(state2.createdAt)
    })

    it('clear removes session completely', () => {
      const sessionId = 'session-123'
      shortTermMemory.getOrCreate(sessionId, 'user-456')

      shortTermMemory.clear(sessionId)

      const state = shortTermMemory.getContext(sessionId)
      expect(state).toBeNull()
    })
  })

  describe('message handling', () => {
    it('adds messages in correct order', () => {
      const sessionId = 'session-123'
      shortTermMemory.getOrCreate(sessionId, 'user-456')

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

      shortTermMemory.addMessage(sessionId, msg1)
      shortTermMemory.addMessage(sessionId, msg2)

      const state = shortTermMemory.getContext(sessionId)
      expect(state?.messages).toHaveLength(2)
      expect(state?.messages[0]).toBe(msg1)
      expect(state?.messages[1]).toBe(msg2)
    })

    it('prunes to max 20 messages — oldest dropped first', () => {
      const sessionId = 'session-123'
      shortTermMemory.getOrCreate(sessionId, 'user-456')

      // Add 25 messages
      for (let i = 0; i < 25; i++) {
        shortTermMemory.addMessage(sessionId, {
          role: 'user',
          content: `Message ${i}`,
          timestamp: Date.now() + i,
        })
      }

      const state = shortTermMemory.getContext(sessionId)
      expect(state?.messages).toHaveLength(20)

      // First 5 messages should be dropped (0-4)
      expect(state?.messages[0].content).toBe('Message 5')
      expect(state?.messages[19].content).toBe('Message 24')
    })
  })

  describe('active resources', () => {
    it('setActiveResource stores escrowId correctly', () => {
      const sessionId = 'session-123'
      shortTermMemory.getOrCreate(sessionId, 'user-456')

      const escrowId = 'escrow-789'
      shortTermMemory.setActiveResource(sessionId, 'escrowId', escrowId)

      const state = shortTermMemory.getContext(sessionId)
      expect(state?.activeEscrowId).toBe(escrowId)
    })

    it('setActiveResource stores inquiryId correctly', () => {
      const sessionId = 'session-123'
      shortTermMemory.getOrCreate(sessionId, 'user-456')

      const inquiryId = 'inquiry-789'
      shortTermMemory.setActiveResource(sessionId, 'inquiryId', inquiryId)

      const state = shortTermMemory.getContext(sessionId)
      expect(state?.activeInquiryId).toBe(inquiryId)
    })

    it('setActiveResource stores offerId correctly', () => {
      const sessionId = 'session-123'
      shortTermMemory.getOrCreate(sessionId, 'user-456')

      const offerId = 'offer-789'
      shortTermMemory.setActiveResource(sessionId, 'offerId', offerId)

      const state = shortTermMemory.getContext(sessionId)
      expect(state?.activeOfferId).toBe(offerId)
    })
  })

  describe('context retrieval', () => {
    it('getContext returns null for unknown sessionId', () => {
      const state = shortTermMemory.getContext('unknown-session')
      expect(state).toBeNull()
    })

    it('getContext returns state for known sessionId', () => {
      const sessionId = 'session-123'
      const userId = 'user-456'
      shortTermMemory.getOrCreate(sessionId, userId)

      const state = shortTermMemory.getContext(sessionId)
      expect(state).toBeDefined()
      expect(state?.userId).toBe(userId)
    })
  })

  describe('session isolation', () => {
    it('two different sessions are fully isolated', () => {
      const session1 = 'session-1'
      const session2 = 'session-2'

      shortTermMemory.getOrCreate(session1, 'user-1')
      shortTermMemory.getOrCreate(session2, 'user-2')

      shortTermMemory.addMessage(session1, {
        role: 'user',
        content: 'Message in session 1',
        timestamp: Date.now(),
      })

      shortTermMemory.addMessage(session2, {
        role: 'user',
        content: 'Message in session 2',
        timestamp: Date.now(),
      })

      shortTermMemory.setActiveResource(session1, 'escrowId', 'escrow-1')
      shortTermMemory.setActiveResource(session2, 'escrowId', 'escrow-2')

      const state1 = shortTermMemory.getContext(session1)
      const state2 = shortTermMemory.getContext(session2)

      expect(state1?.messages).toHaveLength(1)
      expect(state2?.messages).toHaveLength(1)
      expect(state1?.messages[0].content).toBe('Message in session 1')
      expect(state2?.messages[0].content).toBe('Message in session 2')
      expect(state1?.activeEscrowId).toBe('escrow-1')
      expect(state2?.activeEscrowId).toBe('escrow-2')
    })
  })

  describe('session pruning', () => {
    it('pruneOldSessions removes sessions older than 2 hours', () => {
      const sessionId = 'session-123'
      const state = shortTermMemory.getOrCreate(sessionId, 'user-456')

      // Manually set createdAt to 3 hours ago
      state.createdAt = Date.now() - 3 * 60 * 60 * 1000
      state.updatedAt = Date.now() - 3 * 60 * 60 * 1000

      // Trigger pruning by creating a new session
      shortTermMemory.getOrCreate('new-session', 'user-789')

      const pruned = shortTermMemory.getContext(sessionId)
      expect(pruned).toBeNull()
    })

    it('pruneOldSessions does not remove active sessions', () => {
      const sessionId = 'session-123'
      const state = shortTermMemory.getOrCreate(sessionId, 'user-456')

      // Keep updatedAt recent, even if createdAt is old
      state.createdAt = Date.now() - 3 * 60 * 60 * 1000
      state.updatedAt = Date.now() - 30 * 60 * 1000 // 30 minutes ago

      // Trigger pruning
      shortTermMemory.getOrCreate('new-session', 'user-789')

      const active = shortTermMemory.getContext(sessionId)
      expect(active).toBeDefined()
    })
  })

  describe('boundary conditions', () => {
    it('handles null/undefined sessionId gracefully', () => {
      // @ts-ignore - testing boundary
      const state1 = shortTermMemory.getOrCreate(null, 'user-456')
      // @ts-ignore - testing boundary
      const state2 = shortTermMemory.getOrCreate(undefined, 'user-456')

      expect(state1).toBeDefined()
      expect(state2).toBeDefined()
    })

    it('handles empty string inputs', () => {
      const state = shortTermMemory.getOrCreate('', '')

      expect(state).toBeDefined()
      expect(state.sessionId).toBe('')
      expect(state.userId).toBe('')
    })
  })
})
