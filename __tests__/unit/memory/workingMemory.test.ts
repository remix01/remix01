import { workingMemory, WorkingMemoryState } from '@/lib/agent/memory/workingMemory'

describe('WorkingMemory', () => {
  beforeEach(() => {
    // Clear all sessions
    const allSessions = ['session-1', 'session-2', 'test-session']
    allSessions.forEach(id => workingMemory.clear(id))
  })

  describe('completed actions tracking', () => {
    it('hasCompleted returns false before tool is run', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      const isCompleted = workingMemory.hasCompleted(sessionId, 'captureEscrow')
      expect(isCompleted).toBe(false)
    })

    it('hasCompleted returns true after markCompleted', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      workingMemory.markCompleted(sessionId, 'captureEscrow')
      const isCompleted = workingMemory.hasCompleted(sessionId, 'captureEscrow')

      expect(isCompleted).toBe(true)
    })

    it('prevents duplicate captureEscrow via hasCompleted', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      // First call should not be blocked
      expect(workingMemory.hasCompleted(sessionId, 'captureEscrow')).toBe(false)

      // Mark as completed
      workingMemory.markCompleted(sessionId, 'captureEscrow')

      // Second call should be blocked
      expect(workingMemory.hasCompleted(sessionId, 'captureEscrow')).toBe(true)
    })
  })

  describe('pending actions', () => {
    it('setPendingAction stores action correctly', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      const params = { escrowId: 'escrow-456', amount: 100 }
      workingMemory.setPendingAction(
        sessionId,
        'captureEscrow',
        params,
        'user_confirmation'
      )

      const state = workingMemory['store'].get(sessionId)
      expect(state?.pendingAction).toBeDefined()
      expect(state?.pendingAction?.tool).toBe('captureEscrow')
      expect(state?.pendingAction?.params).toEqual(params)
      expect(state?.pendingAction?.waitingFor).toBe('user_confirmation')
    })

    it('resolvePendingAction returns and clears pending action', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      const params = { escrowId: 'escrow-456' }
      workingMemory.setPendingAction(
        sessionId,
        'releaseEscrow',
        params,
        'admin_approval'
      )

      const resolved = workingMemory.resolvePendingAction(sessionId)

      expect(resolved).toBeDefined()
      expect(resolved?.tool).toBe('releaseEscrow')
      expect(resolved?.params).toEqual(params)

      // Verify it's cleared
      const state = workingMemory['store'].get(sessionId)
      expect(state?.pendingAction).toBeUndefined()
    })

    it('resolvePendingAction returns null if no pending action', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      const resolved = workingMemory.resolvePendingAction(sessionId)
      expect(resolved).toBeNull()
    })
  })

  describe('focus management', () => {
    it('setFocus updates focus correctly for escrow', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      const escrowId = 'escrow-789'
      workingMemory.setFocus(sessionId, 'escrow', escrowId, 'paid')

      const state = workingMemory['store'].get(sessionId)
      expect(state?.focus.escrowId).toBe(escrowId)
      expect(state?.focus.escrowStatus).toBe('paid')
    })

    it('setFocus updates focus correctly for inquiry', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      const inquiryId = 'inquiry-789'
      workingMemory.setFocus(sessionId, 'inquiry', inquiryId, 'accepted')

      const state = workingMemory['store'].get(sessionId)
      expect(state?.focus.inquiryId).toBe(inquiryId)
      expect(state?.focus.inquiryStatus).toBe('accepted')
    })

    it('setFocus updates focus correctly for offer', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      const offerId = 'offer-789'
      workingMemory.setFocus(sessionId, 'offer', offerId, 'sprejeta')

      const state = workingMemory['store'].get(sessionId)
      expect(state?.focus.offerId).toBe(offerId)
      expect(state?.focus.offerStatus).toBe('sprejeta')
    })

    it('getFocus returns null for unknown session', () => {
      const focus = workingMemory.getFocus('unknown-session')
      expect(focus).toBeNull()
    })

    it('getFocus returns focus object for known session', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      const escrowId = 'escrow-456'
      workingMemory.setFocus(sessionId, 'escrow', escrowId, 'active')

      const focus = workingMemory.getFocus(sessionId)
      expect(focus).toBeDefined()
      expect(focus?.escrowId).toBe(escrowId)
      expect(focus?.escrowStatus).toBe('active')
    })
  })

  describe('session isolation', () => {
    it('two sessions have isolated working memory', () => {
      const session1 = 'session-1'
      const session2 = 'session-2'

      workingMemory.init(session1, 'user-1')
      workingMemory.init(session2, 'user-2')

      // Set different state in each session
      workingMemory.setFocus(session1, 'escrow', 'escrow-1', 'active')
      workingMemory.setFocus(session2, 'escrow', 'escrow-2', 'completed')

      workingMemory.markCompleted(session1, 'captureEscrow')
      // session2 should not have this marked as completed

      const state1 = workingMemory['store'].get(session1)
      const state2 = workingMemory['store'].get(session2)

      expect(state1?.focus.escrowId).toBe('escrow-1')
      expect(state2?.focus.escrowId).toBe('escrow-2')
      expect(state1?.completedActions).toContain('captureEscrow')
      expect(state2?.completedActions).not.toContain('captureEscrow')
    })

    it('pending actions are session-specific', () => {
      const session1 = 'session-1'
      const session2 = 'session-2'

      workingMemory.init(session1, 'user-1')
      workingMemory.init(session2, 'user-2')

      workingMemory.setPendingAction(
        session1,
        'captureEscrow',
        { escrowId: 'e1' },
        'confirmation'
      )

      // session2 should not have a pending action
      const state1 = workingMemory['store'].get(session1)
      const state2 = workingMemory['store'].get(session2)

      expect(state1?.pendingAction?.tool).toBe('captureEscrow')
      expect(state2?.pendingAction).toBeUndefined()
    })
  })

  describe('session lifecycle', () => {
    it('init creates new session with empty state', () => {
      const sessionId = 'new-session'
      const userId = 'user-456'

      const state = workingMemory.init(sessionId, userId)

      expect(state).toBeDefined()
      expect(state.sessionId).toBe(sessionId)
      expect(state.userId).toBe(userId)
      expect(state.focus).toEqual({})
      expect(state.completedActions).toEqual([])
      expect(state.pendingAction).toBeUndefined()
    })

    it('init returns existing session if already initialized', () => {
      const sessionId = 'session-1'
      const state1 = workingMemory.init(sessionId, 'user-1')
      
      workingMemory.setFocus(sessionId, 'escrow', 'escrow-1', 'active')
      
      const state2 = workingMemory.init(sessionId, 'user-1')

      expect(state1).toBe(state2)
      expect(state2.focus.escrowId).toBe('escrow-1')
    })

    it('clear removes all state for session', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      workingMemory.setFocus(sessionId, 'escrow', 'escrow-1', 'active')
      workingMemory.markCompleted(sessionId, 'captureEscrow')

      workingMemory.clear(sessionId)

      const state = workingMemory['store'].get(sessionId)
      expect(state).toBeUndefined()
    })
  })

  describe('boundary conditions', () => {
    it('handles empty string sessionId', () => {
      const state = workingMemory.init('', 'user-123')
      expect(state).toBeDefined()
      expect(state.sessionId).toBe('')
    })

    it('handles null/undefined in markCompleted gracefully', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      // @ts-ignore - boundary test
      expect(() => workingMemory.markCompleted(sessionId, null)).not.toThrow()
    })

    it('hasCompleted handles unknown session gracefully', () => {
      const result = workingMemory.hasCompleted('unknown-session', 'captureEscrow')
      expect(result).toBe(false)
    })
  })

  describe('multiple completed actions', () => {
    it('tracks multiple completed actions in same session', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      workingMemory.markCompleted(sessionId, 'captureEscrow')
      workingMemory.markCompleted(sessionId, 'releaseEscrow')
      workingMemory.markCompleted(sessionId, 'refundEscrow')

      const state = workingMemory['store'].get(sessionId)
      expect(state?.completedActions).toContain('captureEscrow')
      expect(state?.completedActions).toContain('releaseEscrow')
      expect(state?.completedActions).toContain('refundEscrow')
      expect(state?.completedActions).toHaveLength(3)
    })

    it('prevents duplicate in completed actions list', () => {
      const sessionId = 'session-1'
      workingMemory.init(sessionId, 'user-123')

      workingMemory.markCompleted(sessionId, 'captureEscrow')
      workingMemory.markCompleted(sessionId, 'captureEscrow')

      const state = workingMemory['store'].get(sessionId)
      const count = state?.completedActions.filter(a => a === 'captureEscrow').length
      expect(count).toBe(1) // Should only appear once
    })
  })
})
