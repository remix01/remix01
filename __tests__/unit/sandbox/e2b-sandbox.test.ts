jest.mock('@/lib/env', () => ({ env: { E2B_API_KEY: 'test-key' } }))
jest.mock('@/lib/services/sandbox-observability', () => ({
  getConcurrentSandboxCount: jest.fn().mockResolvedValue(0),
  getDailySandboxUsage: jest.fn(),
  logAbuseEvent: jest.fn().mockResolvedValue(undefined),
  logSandboxExecutionFinished: jest.fn().mockResolvedValue(undefined),
  logSandboxQuotaExceeded: jest.fn().mockResolvedValue(undefined),
  logSandboxSessionStarted: jest.fn().mockResolvedValue(undefined),
}))

const runMock = jest.fn()
const createMock = jest.fn()
const connectMock = jest.fn()

jest.mock('@e2b/code-interpreter', () => ({
  Sandbox: {
    create: (...args: unknown[]) => createMock(...args),
    connect: (...args: unknown[]) => connectMock(...args),
  },
}))

import { executeSandboxCode, SandboxPolicyError, __sandboxInternals } from '@/lib/services/e2b-sandbox'
import { getDailySandboxUsage } from '@/lib/services/sandbox-observability'

describe('e2b sandbox service', () => {
  beforeEach(() => {
    runMock.mockReset()
    createMock.mockReset()
    connectMock.mockReset()
    __sandboxInternals.usageTracker.clear()
    __sandboxInternals.sessionTracker.clear()
    __sandboxInternals.repeatTracker.clear()
    process.env.AI_SANDBOX_ENABLED = 'true'
    ;(getDailySandboxUsage as jest.Mock).mockResolvedValue({ executions: 0, runtimeMs: 0, estimatedCostUsd: 0 })

    createMock.mockResolvedValue({
      sandboxId: 'sbx_1',
      commands: { run: runMock },
    })
    connectMock.mockResolvedValue({ sandboxId: 'sbx_1', commands: { run: runMock } })
  })

  it('rejects unsupported language', async () => {
    await expect(executeSandboxCode({ userId: 'u1', tier: 'start', code: 'print(1)', language: 'ruby' as any }))
      .rejects.toMatchObject({ reason: 'INVALID_LANGUAGE' })
  })

  it('truncates output', async () => {
    runMock.mockResolvedValue({ stdout: 'a'.repeat(17000), stderr: '', exitCode: 0 })
    const res = await executeSandboxCode({ userId: 'u1', tier: 'start', code: 'print(1)', language: 'python' })
    expect(res.truncated.stdout).toBe(true)
    expect(res.stdout.includes('[truncated]')).toBe(true)
  })

  it('times out with policy error', async () => {
    runMock.mockRejectedValue(new Error('timeout reached'))
    await expect(executeSandboxCode({ userId: 'u1', tier: 'start', code: 'print(1)', language: 'python' }))
      .rejects.toBeInstanceOf(SandboxPolicyError)
  })

  it('enforces daily quota', async () => {
    runMock.mockResolvedValue({ stdout: 'ok', stderr: '', exitCode: 0 })
    let executions = 0
    ;(getDailySandboxUsage as jest.Mock).mockImplementation(async () => ({ executions, runtimeMs: 0, estimatedCostUsd: 0 }))
    for (let i = 0; i < 20; i++) {
      await executeSandboxCode({ userId: 'u1', tier: 'start', code: `print(${i})`, language: 'python' })
      executions += 1
    }
    await expect(executeSandboxCode({ userId: 'u1', tier: 'start', code: 'print(99)', language: 'python' }))
      .rejects.toMatchObject({ reason: 'QUOTA_EXCEEDED' })
  })
})
