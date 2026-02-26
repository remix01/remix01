/**
 * Working Memory
 *
 * Tracks the "active" resource the user is currently working on within a
 * single agent session and gates financial tool calls behind explicit
 * confirmation. Entirely in-process — no DB, no external storage.
 */

// ── TYPES ─────────────────────────────────────────────────────────────────────

export type WorkingMemoryState = {
  sessionId: string
  userId: string
  focus: {
    escrowId?: string
    escrowStatus?: string
    inquiryId?: string
    inquiryStatus?: string
    offerId?: string
    offerStatus?: string
  }
  pendingAction?: {
    tool: string
    params: object
    /** e.g. "user_confirmation" | "escrow_release_approval" */
    waitingFor: string
  }
  /** Tool names already completed this session — prevents duplicate actions. */
  completedActions: string[]
}

// ── CLASS ─────────────────────────────────────────────────────────────────────

class WorkingMemory {
  private store: Map<string, WorkingMemoryState> = new Map()

  /** Create or return an existing session state. */
  init(sessionId: string, userId: string): WorkingMemoryState {
    if (this.store.has(sessionId)) {
      return this.store.get(sessionId)!
    }
    const state: WorkingMemoryState = {
      sessionId,
      userId,
      focus: {},
      pendingAction: undefined,
      completedActions: [],
    }
    this.store.set(sessionId, state)
    return state
  }

  /**
   * Pin a resource as the current focus after a successful tool call.
   * Example: after acceptOffer → setFocus(sessionId, 'offer', offerId, 'accepted')
   */
  setFocus(
    sessionId: string,
    resource: 'escrow' | 'inquiry' | 'offer',
    id: string,
    status: string
  ): void {
    const state = this._getOrThrow(sessionId)
    if (resource === 'escrow') {
      state.focus.escrowId = id
      state.focus.escrowStatus = status
    } else if (resource === 'inquiry') {
      state.focus.inquiryId = id
      state.focus.inquiryStatus = status
    } else {
      state.focus.offerId = id
      state.focus.offerStatus = status
    }
  }

  /**
   * Return the current focus so the orchestrator can inject it into the LLM
   * system prompt. Returns null if the session doesn't exist.
   */
  getFocus(sessionId: string): WorkingMemoryState['focus'] | null {
    return this.store.get(sessionId)?.focus ?? null
  }

  /**
   * Register a financial tool call that needs explicit user confirmation before
   * it can be executed.
   * Example: before releaseEscrow → setPendingAction(..., 'user_confirmation')
   */
  setPendingAction(
    sessionId: string,
    tool: string,
    params: object,
    waitingFor: string
  ): void {
    const state = this._getOrThrow(sessionId)
    state.pendingAction = { tool, params, waitingFor }
  }

  /**
   * Return and clear the pending action — call this once the user confirms.
   * Returns null if there is nothing pending.
   */
  resolvePendingAction(
    sessionId: string
  ): WorkingMemoryState['pendingAction'] | null {
    const state = this.store.get(sessionId)
    if (!state?.pendingAction) return null
    const action = state.pendingAction
    state.pendingAction = undefined
    return action
  }

  /** Mark a tool as completed so the agent won't suggest it again this session. */
  markCompleted(sessionId: string, tool: string): void {
    const state = this._getOrThrow(sessionId)
    if (!state.completedActions.includes(tool)) {
      state.completedActions.push(tool)
    }
  }

  /** Returns true if this tool has already been executed in the current session. */
  hasCompleted(sessionId: string, tool: string): boolean {
    return this.store.get(sessionId)?.completedActions.includes(tool) ?? false
  }

  /** Wipe the session entirely (e.g. on logout or explicit reset). */
  clear(sessionId: string): void {
    this.store.delete(sessionId)
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private _getOrThrow(sessionId: string): WorkingMemoryState {
    const state = this.store.get(sessionId)
    if (!state) {
      throw new Error(
        `[WorkingMemory] Session "${sessionId}" not initialised. Call init() first.`
      )
    }
    return state
  }
}

export const workingMemory = new WorkingMemory()

// ── HELPERS ───────────────────────────────────────────────────────────────────

/** Financial tools that require explicit user confirmation before execution. */
export const FINANCIAL_TOOLS = new Set([
  'captureEscrow',
  'releaseEscrow',
  'refundEscrow',
])

/**
 * Build the working-memory context string injected into the LLM system prompt.
 * Keeps the LLM informed about what the user is currently doing so it never
 * has to ask for an ID that was already established this session.
 */
export function formatWorkingContextForPrompt(
  focus: WorkingMemoryState['focus'],
  pendingAction?: WorkingMemoryState['pendingAction'],
  completedActions: string[] = []
): string {
  const parts: string[] = []

  if (focus.inquiryId) {
    parts.push(
      `User is working on inquiry #${focus.inquiryId} (status: ${focus.inquiryStatus ?? 'unknown'}).`
    )
  }
  if (focus.offerId) {
    parts.push(
      `An offer #${focus.offerId} is in focus (status: ${focus.offerStatus ?? 'unknown'}).`
    )
  }
  if (focus.escrowId) {
    parts.push(
      `Escrow #${focus.escrowId} is active (status: ${focus.escrowStatus ?? 'unknown'}).`
    )
  }

  if (pendingAction) {
    parts.push(
      `PENDING: tool "${pendingAction.tool}" is awaiting "${pendingAction.waitingFor}" before it can run.`
    )
  }

  if (completedActions.length > 0) {
    parts.push(`Already completed this session: ${completedActions.join(', ')}.`)
  }

  return parts.length > 0
    ? `SESSION CONTEXT:\n${parts.join('\n')}`
    : ''
}
