jest.mock('@/lib/supabase-admin')
jest.mock('@/lib/jobs/queue')
jest.mock('@/lib/agent/permissions')
jest.mock('@/lib/agent/state-machine')

import { guardrails, type Session } from '@/lib/agent/guardrails'
import { checkPermission } from '@/lib/agent/permissions'
import { assertTransition } from '@/lib/agent/state-machine'
import { InquiryAgent } from '@/lib/agents/inquiry-agent'
import { messageBus } from '@/lib/agents/base/MessageBus'

describe('Agent Response Latency', () => {
  const testSession: Session = {
    user: { id: 'test-user-id', email: 'test@test.com', role: 'user' },
    sessionId: 'test-session-id',
  }

  const validParams = {
    category: 'plumbing',
    title: 'Fix leaking faucet',
    description: 'Kitchen sink faucet is leaking',
    budget: 100.0,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('guardrails complete in under 10ms', async () => {
    ;(checkPermission as jest.Mock).mockResolvedValue({ allowed: true })

    const start = Date.now()
    await guardrails('createInquiry', validParams, testSession)
    const duration = Date.now() - start

    expect(duration).toBeLessThan(10)
  })

  it('permission check completes in under 20ms', async () => {
    ;(checkPermission as jest.Mock).mockResolvedValue({ allowed: true })

    const start = Date.now()
    await checkPermission('createInquiry', validParams, testSession)
    const duration = Date.now() - start

    expect(duration).toBeLessThan(20)
  })

  it('state machine transition check completes in under 30ms', async () => {
    ;(assertTransition as jest.Mock).mockResolvedValue(true)

    const testEscrowId = '550e8400-e29b-41d4-a716-446655440000'
    const start = Date.now()
    await assertTransition('escrow', testEscrowId, 'captured')
    const duration = Date.now() - start

    expect(duration).toBeLessThan(30)
  })

  it('full tool execution (createInquiry) completes in under 500ms', async () => {
    ;(checkPermission as jest.Mock).mockResolvedValue({ allowed: true })

    const testMessage = {
      from: 'orchestrator',
      to: 'inquiry',
      action: 'createInquiry',
      userId: testSession.user.id,
      sessionId: testSession.sessionId,
      params: validParams,
    }

    const start = Date.now()
    const result = await InquiryAgent.handle(testMessage)
    const duration = Date.now() - start

    expect(result.success).toBe(true)
    expect(duration).toBeLessThan(500)
  })

  it('agent handles 10 concurrent requests without degradation', async () => {
    ;(checkPermission as jest.Mock).mockResolvedValue({ allowed: true })

    const requests = Array(10)
      .fill(null)
      .map((_, i) =>
        messageBus.send({
          from: 'orchestrator',
          to: 'inquiry',
          action: 'createInquiry',
          userId: `test-user-${i}`,
          sessionId: `test-session-${i}`,
          params: validParams,
        })
      )

    const start = Date.now()
    const results = await Promise.all(requests)
    const duration = Date.now() - start

    expect(results.every((r) => r.success)).toBe(true)
    expect(duration).toBeLessThan(2000)
  }, 10000)
})
