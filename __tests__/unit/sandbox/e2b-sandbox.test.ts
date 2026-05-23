jest.mock('@/lib/env', () => ({ env: { E2B_API_KEY: 'test-key' } }))

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

describe('e2b sandbox service', () => {
  beforeEach(() => {
    runMock.mockReset()
    createMock.mockReset()
    connectMock.mockReset()
    __sandboxInternals.usageTracker.clear()
    __sandboxInternals.sessionTracker.clear()
    __sandboxInternals.repeatTracker.clear()
    process.env.AI_SANDBOX_ENABLED = 'true'

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


  it('passes policy timeout when reconnecting sandbox', async () => {
    runMock.mockResolvedValue({ stdout: 'ok', stderr: '', exitCode: 0 })

    await executeSandboxCode({ userId: 'u1', tier: 'start', code: 'print(1)', language: 'python' })
    await executeSandboxCode({ userId: 'u1', tier: 'start', code: 'print(2)', language: 'python', sandboxId: 'sbx_1' })

    expect(connectMock).toHaveBeenCalledWith('sbx_1', { apiKey: 'test-key', timeoutMs: 45_000 })
  })

  it('enforces daily quota', async () => {
    runMock.mockResolvedValue({ stdout: 'ok', stderr: '', exitCode: 0 })
    for (let i = 0; i < 20; i++) {
      await executeSandboxCode({ userId: 'u1', tier: 'start', code: `print(${i})`, language: 'python' })
    }
    await expect(executeSandboxCode({ userId: 'u1', tier: 'start', code: 'print(99)', language: 'python' }))
      .rejects.toMatchObject({ reason: 'QUOTA_EXCEEDED' })
  })
})
