/**
 * Short Term Memory — shared Redis-backed conversation state for LiftGO agents.
 *
 * - Shared across instances (Redis)
 * - Session isolation enforced by sessionId + userId ownership checks
 * - TTL-based expiry (default: 2h)
 */

import { executeRedisOperation } from '@/lib/cache/redis-client'

const MAX_MESSAGES = 20
const SESSION_TTL_SECONDS = 2 * 60 * 60 // 2 hours
const KEY_PREFIX = 'agent:short-term:v1'

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
  private key(sessionId: string): string {
    return `${KEY_PREFIX}:${sessionId}`
  }

  private async getState(sessionId: string): Promise<ConversationState | null> {
    const key = this.key(sessionId)
    const raw = await executeRedisOperation(
      async (redis) => redis.get<string>(key),
      null,
      'shortTerm.getState'
    )

    if (!raw) return null

    try {
      return typeof raw === 'string' ? (JSON.parse(raw) as ConversationState) : (raw as ConversationState)
    } catch {
      return null
    }
  }

  private async setState(state: ConversationState): Promise<void> {
    const key = this.key(state.sessionId)
    await executeRedisOperation(
      async (redis) => {
        await redis.set(key, JSON.stringify(state), { ex: SESSION_TTL_SECONDS })
      },
      undefined,
      'shortTerm.setState'
    )
  }

  async getOrCreate(sessionId: string, userId: string): Promise<ConversationState> {
    const existing = await this.getState(sessionId)

    if (existing) {
      if (existing.userId !== userId) {
        throw new Error('Session ownership mismatch')
      }

      existing.updatedAt = Date.now()
      await this.setState(existing)
      return existing
    }

    const state: ConversationState = {
      sessionId,
      userId,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    await this.setState(state)
    return state
  }

  async addMessage(sessionId: string, message: Message, userId?: string): Promise<void> {
    const state = await this.getState(sessionId)
    if (!state) return
    if (userId && state.userId !== userId) throw new Error('Session ownership mismatch')

    state.messages.push(message)
    if (state.messages.length > MAX_MESSAGES) {
      state.messages = state.messages.slice(state.messages.length - MAX_MESSAGES)
    }

    state.updatedAt = Date.now()
    await this.setState(state)
  }

  async setActiveResource(
    sessionId: string,
    resource: 'escrowId' | 'inquiryId' | 'offerId',
    id: string,
    userId?: string
  ): Promise<void> {
    const state = await this.getState(sessionId)
    if (!state) return
    if (userId && state.userId !== userId) throw new Error('Session ownership mismatch')

    if (resource === 'escrowId') state.activeEscrowId = id
    if (resource === 'inquiryId') state.activeInquiryId = id
    if (resource === 'offerId') state.activeOfferId = id

    state.updatedAt = Date.now()
    await this.setState(state)
  }

  async getContext(sessionId: string, userId?: string): Promise<ConversationState | null> {
    const state = await this.getState(sessionId)
    if (!state) return null
    if (userId && state.userId !== userId) return null

    // touch TTL on read
    state.updatedAt = Date.now()
    await this.setState(state)
    return state
  }

  async clear(sessionId: string): Promise<void> {
    const key = this.key(sessionId)
    await executeRedisOperation(async (redis) => redis.del(key), undefined, 'shortTerm.clear')
  }
}

export const shortTermMemory = new ShortTermMemory()
