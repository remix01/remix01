/**
 * Short Term Memory — In-process conversation state for the LiftGO agent
 *
 * Keeps track of the last N messages per session so the LLM has conversational
 * context without needing a database or Redis. Memory is lost on process restart,
 * which is acceptable for short-lived chat sessions.
 *
 * Design choices:
 * - Storage: plain Map<sessionId, ConversationState> (no DB, no Redis)
 * - Max messages: 20 per session (prevents token overflow)
 * - Auto-expiry: sessions inactive for > 2 hours are pruned
 */

const MAX_MESSAGES = 20
const SESSION_TTL_MS = 2 * 60 * 60 * 1000 // 2 hours

export type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  toolCall?: { tool: string; params: object }
  toolResult?: { success: boolean; data?: any; error?: string }
}

export type ConversationState = {
  sessionId: string
  userId: string
  messages: Message[]
  activeEscrowId?: string
  activeInquiryId?: string
  activeOfferId?: string
  lastToolCall?: string
  createdAt: number
  updatedAt: number
}

class ShortTermMemory {
  private store: Map<string, ConversationState> = new Map()

  /**
   * Returns an existing session or creates a fresh one.
   * Also prunes stale sessions on each call to avoid unbounded growth.
   */
  getOrCreate(sessionId: string, userId: string): ConversationState {
    this.pruneOldSessions()

    const existing = this.store.get(sessionId)
    if (existing) {
      return existing
    }

    const state: ConversationState = {
      sessionId,
      userId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    this.store.set(sessionId, state)
    return state
  }

  /**
   * Appends a message to the session history.
   * Drops the oldest message when MAX_MESSAGES is exceeded so we never
   * send more tokens than the LLM context budget allows.
   */
  addMessage(sessionId: string, message: Message): void {
    const state = this.store.get(sessionId)
    if (!state) return

    state.messages.push(message)

    // Keep only the last MAX_MESSAGES
    if (state.messages.length > MAX_MESSAGES) {
      state.messages = state.messages.slice(state.messages.length - MAX_MESSAGES)
    }

    state.updatedAt = Date.now()
  }

  /**
   * Stores the currently active resource ID so the LLM can reference it
   * in follow-up messages without requiring the user to repeat it.
   */
  setActiveResource(
    sessionId: string,
    resource: 'escrowId' | 'inquiryId' | 'offerId',
    id: string
  ): void {
    const state = this.store.get(sessionId)
    if (!state) return

    if (resource === 'escrowId') state.activeEscrowId = id
    if (resource === 'inquiryId') state.activeInquiryId = id
    if (resource === 'offerId') state.activeOfferId = id

    state.updatedAt = Date.now()
  }

  /**
   * Returns the full conversation state for a session, or null if it does not exist.
   */
  getContext(sessionId: string): ConversationState | null {
    return this.store.get(sessionId) ?? null
  }

  /**
   * Clears a session — call after the conversation is complete or timed out.
   */
  clear(sessionId: string): void {
    this.store.delete(sessionId)
  }

  /**
   * Removes sessions that have been inactive for longer than SESSION_TTL_MS.
   * Called automatically on getOrCreate() so no external scheduler is needed.
   */
  pruneOldSessions(): void {
    const cutoff = Date.now() - SESSION_TTL_MS
    for (const [id, state] of this.store.entries()) {
      if (state.updatedAt < cutoff) {
        this.store.delete(id)
      }
    }
  }
}

export const shortTermMemory = new ShortTermMemory()
