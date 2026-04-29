import { describe, it, expect, afterEach, jest } from '@jest/globals'

// uuid@13 is ESM-only and cannot be parsed by Jest's CJS transform
jest.mock('uuid', () => ({ v4: jest.fn(() => 'test-uuid') }))

// Must mock observability before any imports that transitively load it
jest.mock('@/lib/observability', () => ({
  agentLogger: { log: jest.fn() },
  tracer: {
    startTrace: jest.fn().mockReturnValue({
      traceId: 'trace-1',
      spanId: 'span-1',
      operation: 'test',
      startTime: Date.now(),
      status: 'ok' as const,
      attributes: {} as Record<string, string | number | boolean>,
      endTime: undefined as number | undefined,
    }),
    endSpan: jest.fn(),
    export: jest.fn().mockResolvedValue(undefined),
  },
}))

import { MessageBus, AgentNotRegisteredError } from '@/lib/agents/base/MessageBus'
import { BaseAgent } from '@/lib/agents/base/BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from '@/lib/agents/base/types'

// ─── Test double ─────────────────────────────────────────────────────────────

class StubAgent extends BaseAgent {
  type: AgentType
  handledActions: string[]
  private response: AgentResponse

  constructor(
    type: AgentType,
    actions: string[],
    response: AgentResponse
  ) {
    super()
    this.type = type
    this.handledActions = actions
    this.response = response
  }

  async handle(_message: AgentMessage): Promise<AgentResponse> {
    return this.response
  }
}

function makeMessage(overrides: Partial<AgentMessage> = {}): AgentMessage {
  return {
    id: 'msg-1',
    from: 'orchestrator',
    to: 'inquiry',
    type: 'request',
    action: 'createInquiry',
    payload: { title: 'Test' },
    correlationId: 'corr-1',
    sessionId: 'sess-1',
    userId: 'user-1',
    timestamp: Date.now(),
    priority: 'normal',
    ...overrides,
  }
}

function makeSuccessResponse(agent: AgentType): AgentResponse {
  return { success: true, data: { id: 'res-1' }, handledBy: agent, durationMs: 5 }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

afterEach(() => {
  jest.clearAllMocks()
})

describe('MessageBus.register / getRegistered / isRegistered', () => {
  it('registers an agent and makes it visible in getRegistered()', () => {
    const bus = new MessageBus()
    const agent = new StubAgent('inquiry', ['createInquiry'], makeSuccessResponse('inquiry'))
    bus.register(agent)

    expect(bus.getRegistered()).toContain('inquiry')
    expect(bus.isRegistered('inquiry')).toBe(true)
  })

  it('returns false for an agent that was never registered', () => {
    const bus = new MessageBus()
    expect(bus.isRegistered('escrow')).toBe(false)
  })

  it('overwrites an existing agent registration (warns)', () => {
    const bus = new MessageBus()
    const agent1 = new StubAgent('inquiry', ['createInquiry'], makeSuccessResponse('inquiry'))
    const agent2 = new StubAgent('inquiry', ['listInquiries'], makeSuccessResponse('inquiry'))

    bus.register(agent1)
    bus.register(agent2)

    expect(bus.getRegistered().filter(t => t === 'inquiry')).toHaveLength(1)
  })

  it('can register multiple different agents', () => {
    const bus = new MessageBus()
    bus.register(new StubAgent('inquiry', [], makeSuccessResponse('inquiry')))
    bus.register(new StubAgent('escrow', [], makeSuccessResponse('escrow')))
    bus.register(new StubAgent('dispute', [], makeSuccessResponse('dispute')))

    expect(bus.getRegistered()).toHaveLength(3)
  })
})

describe('MessageBus.send — routing', () => {
  it('routes a message to the correct registered agent and returns its response', async () => {
    const bus = new MessageBus()
    const agent = new StubAgent('inquiry', ['createInquiry'], makeSuccessResponse('inquiry'))
    bus.register(agent)

    const response = await bus.send(makeMessage({ to: 'inquiry', action: 'createInquiry' }))

    expect(response.success).toBe(true)
    expect(response.handledBy).toBe('inquiry')
  })

  it('throws AgentNotRegisteredError when sending to an unregistered agent', async () => {
    const bus = new MessageBus()

    await expect(bus.send(makeMessage({ to: 'escrow' }))).rejects.toThrow(AgentNotRegisteredError)
    await expect(bus.send(makeMessage({ to: 'escrow' }))).rejects.toThrow(
      "Agent type 'escrow' is not registered"
    )
  })

  it('returns a failure response when the agent cannot handle the action', async () => {
    const bus = new MessageBus()
    // Agent only handles 'listInquiries', not 'createInquiry'
    const agent = new StubAgent('inquiry', ['listInquiries'], makeSuccessResponse('inquiry'))
    bus.register(agent)

    const response = await bus.send(makeMessage({ to: 'inquiry', action: 'createInquiry' }))

    expect(response.success).toBe(false)
    expect(response.error).toMatch(/cannot handle action/)
    expect(response.handledBy).toBe('inquiry')
  })

  it('surfaces errors thrown by the agent handler', async () => {
    const bus = new MessageBus()
    const failingAgent = {
      type: 'inquiry' as AgentType,
      handledActions: ['createInquiry'],
      canHandle: () => true,
      handle: jest.fn().mockRejectedValue(new Error('DB connection lost') as never),
    } as unknown as BaseAgent
    bus.register(failingAgent)

    await expect(
      bus.send(makeMessage({ to: 'inquiry', action: 'createInquiry' }))
    ).rejects.toThrow('DB connection lost')
  })

  it('passes the full message payload to the agent handler', async () => {
    const bus = new MessageBus()
    const handleSpy = jest.fn().mockResolvedValue(makeSuccessResponse('inquiry') as never)
    const agent = {
      type: 'inquiry' as AgentType,
      handledActions: ['createInquiry'],
      canHandle: () => true,
      handle: handleSpy,
    } as unknown as BaseAgent
    bus.register(agent)

    const msg = makeMessage({ payload: { title: 'Fix roof', location: 'Ljubljana' } })
    await bus.send(msg)

    expect(handleSpy).toHaveBeenCalledWith(msg)
  })
})

describe('AgentNotRegisteredError', () => {
  it('is an instance of Error', () => {
    const err = new AgentNotRegisteredError('dispute')
    expect(err).toBeInstanceOf(Error)
  })

  it('carries the correct name', () => {
    const err = new AgentNotRegisteredError('dispute')
    expect(err.name).toBe('AgentNotRegisteredError')
  })

  it('includes the agent type in the message', () => {
    const err = new AgentNotRegisteredError('notify')
    expect(err.message).toContain('notify')
  })
})

describe('MessageBus.broadcast', () => {
  it('fires a message toward the notify agent (fire-and-forget)', async () => {
    const bus = new MessageBus()
    const handleSpy = jest.fn().mockResolvedValue(makeSuccessResponse('notify') as never)
    const notifyAgent = {
      type: 'notify' as AgentType,
      handledActions: ['escrow_released'],
      canHandle: () => true,
      handle: handleSpy,
    } as unknown as BaseAgent
    bus.register(notifyAgent)

    // broadcast is fire-and-forget, so we just await it and verify the agent was called
    bus.broadcast('escrow', 'escrow_released', { escrowId: 'esc-1' }, 'sess-1', 'user-1')

    // allow the microtask to flush
    await new Promise(resolve => setImmediate(resolve))

    expect(handleSpy).toHaveBeenCalled()
    const receivedMsg: AgentMessage = handleSpy.mock.calls[0]?.[0] as AgentMessage
    expect(receivedMsg.to).toBe('notify')
    expect(receivedMsg.action).toBe('escrow_released')
    expect(receivedMsg.from).toBe('escrow')
  })

  it('does not throw even if notify agent is not registered', async () => {
    const bus = new MessageBus()

    // No notify agent registered — should swallow the error
    await expect(
      (async () => {
        bus.broadcast('escrow', 'escrow_released', {}, 'sess-1', 'user-1')
        await new Promise(resolve => setImmediate(resolve))
      })()
    ).resolves.not.toThrow()
  })
})

describe('BaseAgent.canHandle', () => {
  it('returns true for a listed action', () => {
    const agent = new StubAgent('inquiry', ['createInquiry', 'listInquiries'], makeSuccessResponse('inquiry'))
    expect(agent.canHandle('createInquiry')).toBe(true)
    expect(agent.canHandle('listInquiries')).toBe(true)
  })

  it('returns false for an unlisted action', () => {
    const agent = new StubAgent('inquiry', ['createInquiry'], makeSuccessResponse('inquiry'))
    expect(agent.canHandle('releaseEscrow')).toBe(false)
  })

  it('returns false for an empty action string', () => {
    const agent = new StubAgent('inquiry', ['createInquiry'], makeSuccessResponse('inquiry'))
    expect(agent.canHandle('')).toBe(false)
  })
})
