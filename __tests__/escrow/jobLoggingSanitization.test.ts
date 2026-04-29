const publishJSON = jest.fn()

jest.mock('@upstash/qstash', () => ({
  Client: jest.fn().mockImplementation(() => ({
    publishJSON,
  })),
}))

describe('QStash logging sanitization', () => {
  const originalEnv = process.env
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})

  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      QSTASH_TOKEN: 'token',
      QSTASH_CURRENT_SIGNING_KEY: 'current',
      QSTASH_NEXT_SIGNING_KEY: 'next',
      NEXT_PUBLIC_APP_URL: 'https://example.com',
    }
    publishJSON.mockResolvedValue({ messageId: 'msg_123' })
  })

  afterAll(() => {
    process.env = originalEnv
    logSpy.mockRestore()
  })

  it('does not log raw payload in enqueue success log', async () => {
    const { enqueue } = await import('@/lib/jobs/queue')
    await enqueue('sendEmail', {
      transactionId: 'txn_1',
      recipientEmail: 'secret@example.com',
      token: 'super-secret-token',
      escrowId: 'esc_1',
    } as any)

    const call = logSpy.mock.calls.find(([msg]) => msg === '[JOB ENQUEUED]')
    expect(call).toBeDefined()
    const metadata = call?.[1] as Record<string, unknown>
    expect(metadata).toMatchObject({ jobType: 'sendEmail', messageId: 'msg_123', escrowId: 'esc_1' })
    expect(JSON.stringify(metadata)).not.toContain('secret@example.com')
    expect(JSON.stringify(metadata)).not.toContain('super-secret-token')
  })


  it('adds correlationId/jobId metadata to published envelope', async () => {
    const { enqueue } = await import('@/lib/jobs/queue')
    await enqueue('webhook', { escrowId: 'esc_1', job_id: 'legacy_job_1' } as any)

    expect(publishJSON).toHaveBeenCalledTimes(1)
    const publishArg = publishJSON.mock.calls[0][0]
    expect(publishArg.body.metadata).toBeDefined()
    expect(publishArg.body.metadata.jobId).toBe('legacy_job_1')
    expect(typeof publishArg.body.metadata.correlationId).toBe('string')
  })

})
