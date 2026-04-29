import { describe, it, expect, afterEach, jest } from '@jest/globals'

// Mock the Anthropic SDK before any module imports.
// The factory stores mockCreate on the module export so we can access it via
// jest.requireMock() even after jest.clearAllMocks() clears call history.
jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn()
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
    _mockCreate: mockCreate,
  }
})

import { intentMap, routeIntent } from '@/lib/agents/orchestrator-agent/intentRouter'
import type { ConversationState } from '@/lib/agent/memory/shortTerm'

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Stable reference to the mock — survives jest.clearAllMocks()
const mockCreate = (jest.requireMock('@anthropic-ai/sdk') as { _mockCreate: jest.MockedFunction<() => Promise<unknown>> })._mockCreate

function makeConversationState(overrides: Partial<ConversationState> = {}): ConversationState {
  return {
    sessionId: 'sess-test',
    userId: 'user-test',
    messages: [],
    activeInquiryId: null,
    activeOfferId: null,
    activeEscrowId: null,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ...overrides,
  }
}

function makeLLMResponse(text: string) {
  return {
    content: [{ type: 'text', text }],
  }
}

afterEach(() => {
  jest.clearAllMocks()
})

// ─── intentMap ────────────────────────────────────────────────────────────────

describe('intentMap — action → agent routing table', () => {
  it('createInquiry routes to inquiry agent', () => {
    expect(intentMap['createInquiry']).toBe('inquiry')
  })

  it('listInquiries routes to inquiry agent', () => {
    expect(intentMap['listInquiries']).toBe('inquiry')
  })

  it('closeInquiry routes to inquiry agent', () => {
    expect(intentMap['closeInquiry']).toBe('inquiry')
  })

  it('submitOffer routes to escrow agent', () => {
    expect(intentMap['submitOffer']).toBe('escrow')
  })

  it('acceptOffer routes to escrow agent', () => {
    expect(intentMap['acceptOffer']).toBe('escrow')
  })

  it('captureEscrow routes to escrow agent', () => {
    expect(intentMap['captureEscrow']).toBe('escrow')
  })

  it('releaseEscrow routes to escrow agent', () => {
    expect(intentMap['releaseEscrow']).toBe('escrow')
  })

  it('refundEscrow routes to escrow agent', () => {
    expect(intentMap['refundEscrow']).toBe('escrow')
  })

  it('openDispute routes to dispute agent', () => {
    expect(intentMap['openDispute']).toBe('dispute')
  })

  it('resolveDispute routes to dispute agent', () => {
    expect(intentMap['resolveDispute']).toBe('dispute')
  })

  it('sendNotification routes to notify agent', () => {
    expect(intentMap['sendNotification']).toBe('notify')
  })

  it('updatePreferences routes to notify agent', () => {
    expect(intentMap['updatePreferences']).toBe('notify')
  })

  it('contains no unknown agent targets', () => {
    const validAgents = new Set(['inquiry', 'escrow', 'dispute', 'notify', 'orchestrator'])
    for (const [action, agent] of Object.entries(intentMap)) {
      if (!validAgents.has(agent)) {
        throw new Error(`${action} maps to unknown agent '${agent}'`)
      }
    }
  })
})

// ─── routeIntent ──────────────────────────────────────────────────────────────

describe('routeIntent', () => {
  it('routes high-confidence intent to the correct agent', async () => {
    mockCreate.mockResolvedValue(
      makeLLMResponse(
        JSON.stringify({
          action: 'createInquiry',
          confidence: 0.95,
          extractedParams: { title: 'Popravilo pipe', location: 'Ljubljana' },
          clarificationNeeded: null,
        })
      ) as never
    )

    const result = await routeIntent('Rabim vodovodarja v Ljubljani', makeConversationState())

    expect(result.action).toBe('createInquiry')
    expect(result.targetAgent).toBe('inquiry')
    expect(result.confidence).toBe(0.95)
    expect(result.extractedParams).toEqual({ title: 'Popravilo pipe', location: 'Ljubljana' })
  })

  it('returns clarify intent when confidence is below 0.6', async () => {
    mockCreate.mockResolvedValue(
      makeLLMResponse(
        JSON.stringify({
          action: 'createInquiry',
          confidence: 0.4,
          extractedParams: {},
          clarificationNeeded: 'Ali iščete vodovodarja ali elektrikarja?',
        })
      ) as never
    )

    const result = await routeIntent('Imam težavo', makeConversationState())

    expect(result.action).toBe('clarify')
    expect(result.targetAgent).toBe('orchestrator')
    expect(result.extractedParams.clarification).toBe('Ali iščete vodovodarja ali elektrikarja?')
  })

  it('falls back to orchestrator for actions not in intentMap', async () => {
    mockCreate.mockResolvedValue(
      makeLLMResponse(
        JSON.stringify({
          action: 'unknownAction',
          confidence: 0.9,
          extractedParams: {},
          clarificationNeeded: null,
        })
      ) as never
    )

    const result = await routeIntent('Do something unknown', makeConversationState())

    expect(result.targetAgent).toBe('orchestrator')
    expect(result.action).toBe('unknownAction')
  })

  it('returns clarify fallback when LLM returns no text content', async () => {
    mockCreate.mockResolvedValue({ content: [] } as never)

    const result = await routeIntent('???', makeConversationState())

    expect(result.action).toBe('clarify')
    expect(result.confidence).toBe(0)
    expect(result.extractedParams.clarification).toBeTruthy()
  })

  it('returns clarify fallback when LLM response contains invalid JSON', async () => {
    mockCreate.mockResolvedValue(
      makeLLMResponse('This is not JSON at all.') as never
    )

    const result = await routeIntent('hello', makeConversationState())

    expect(result.action).toBe('clarify')
    expect(result.confidence).toBe(0)
  })

  it('returns clarify fallback when Anthropic SDK throws', async () => {
    mockCreate.mockRejectedValue(new Error('API rate limit') as never)

    const result = await routeIntent('Rabim pomoč', makeConversationState())

    expect(result.action).toBe('clarify')
    expect(result.confidence).toBe(0)
    expect(typeof result.extractedParams.clarification).toBe('string')
  })

  it('extracts JSON embedded in prose from LLM response', async () => {
    // LLM sometimes wraps JSON in markdown or prose
    mockCreate.mockResolvedValue(
      makeLLMResponse(
        `Sure, here is my analysis:\n${JSON.stringify({
          action: 'releaseEscrow',
          confidence: 0.88,
          extractedParams: { escrowId: 'esc-123' },
          clarificationNeeded: null,
        })}\nI hope this helps.`
      ) as never
    )

    const result = await routeIntent('Release escrow esc-123', makeConversationState())

    expect(result.action).toBe('releaseEscrow')
    expect(result.targetAgent).toBe('escrow')
    expect(result.extractedParams).toMatchObject({ escrowId: 'esc-123' })
  })

  it('passes conversation context (active IDs) to the LLM prompt', async () => {
    mockCreate.mockResolvedValue(
      makeLLMResponse(
        JSON.stringify({
          action: 'escrowStatus',
          confidence: 0.9,
          extractedParams: {},
          clarificationNeeded: null,
        })
      ) as never
    )

    const state = makeConversationState({ activeEscrowId: 'esc-42' })
    await routeIntent('What is the escrow status?', state)

    const callArgs = mockCreate.mock.calls[0] as any[]
    const systemPrompt: string = callArgs[0]?.system ?? ''
    expect(systemPrompt).toContain('esc-42')
  })
})
