const fromMock = jest.fn()
const rpcMock = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({ from: fromMock, rpc: rpcMock }),
}))

import { cleanupSandboxData, getConcurrentSandboxCount, getDailySandboxUsage, getSandboxUsageByTier, logAbuseEvent, logSandboxExecutionFinished, logSandboxQuotaExceeded, logSandboxSessionStarted } from '@/lib/services/sandbox-observability'

describe('sandbox observability persistence', () => {
  beforeEach(() => {
    fromMock.mockReset()
    rpcMock.mockReset()
  })

  it('writes session start', async () => {
    const upsert = jest.fn().mockResolvedValue({})
    fromMock.mockReturnValue({ upsert })
    await logSandboxSessionStarted({ userId: 'u1', sandboxId: 's1', template: 'base', language: 'python', tier: 'start' })
    expect(upsert).toHaveBeenCalled()
  })

  it('writes execution and updates aggregates', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: { id: 'sess1' } })
    const insert = jest.fn().mockResolvedValue({})
    fromMock
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ maybeSingle }) }) })
      .mockReturnValueOnce({ insert })
    rpcMock.mockResolvedValue({ error: null })

    await logSandboxExecutionFinished({ userId: 'u1', sandboxId: 's1', executionId: 'e1', runtimeMs: 10, stdoutSize: 1, stderrSize: 0, exitCode: 0, timedOut: false })
    expect(insert).toHaveBeenCalled()
    expect(rpcMock).toHaveBeenCalled()
  })

  it('writes abuse and quota events', async () => {
    const insert = jest.fn().mockResolvedValue({})
    fromMock.mockReturnValue({ insert })
    await logAbuseEvent({ userId: 'u1', eventType: 'quota_violation' })
    await logSandboxQuotaExceeded({ userId: 'u1', reason: 'QUOTA_EXCEEDED' })
    expect(insert).toHaveBeenCalledTimes(2)
  })

  it('computes usage aggregates and concurrency', async () => {
    fromMock
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ gte: jest.fn().mockResolvedValue({ data: [{ runtime_ms: 10, estimated_cost_usd: 0.1 }] }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: () => ({ eq: jest.fn().mockResolvedValue({ count: 2 }) }) }) })
      .mockReturnValueOnce({ select: () => ({ eq: jest.fn().mockResolvedValue({ data: [{ tier: 'start', execution_count: 2, runtime_total_ms: 20 }] }) }) })

    const daily = await getDailySandboxUsage('u1')
    const concurrent = await getConcurrentSandboxCount('u1')
    const byTier = await getSandboxUsageByTier('u1')
    expect(daily.executions).toBe(1)
    expect(concurrent).toBe(2)
    expect(byTier.start.executions).toBe(2)
  })

  it('runs cleanup updates', async () => {
    const eq = jest.fn().mockResolvedValue({})
    const lt = jest.fn(() => ({ eq }))
    const update = jest.fn(() => ({ lt }))
    const del = jest.fn(() => ({ is: jest.fn().mockResolvedValue({}) }))
    fromMock
      .mockReturnValueOnce({ update })
      .mockReturnValueOnce({ update })
      .mockReturnValueOnce({ delete: del })
    await cleanupSandboxData('2026-01-01T00:00:00.000Z')
    expect(update).toHaveBeenCalledTimes(2)
  })
})
