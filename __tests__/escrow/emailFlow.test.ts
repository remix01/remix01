import { processJob } from '@/lib/jobs/processor'
import { handleEmailJob } from '@/lib/jobs/workers/emailWorker'

jest.mock('@/lib/jobs/workers/emailWorker', () => ({
  handleEmailJob: jest.fn(),
}))

describe('email job routing and queue fail-fast', () => {
  const mockedHandleEmailJob = handleEmailJob as jest.MockedFunction<typeof handleEmailJob>

  beforeEach(() => {
    mockedHandleEmailJob.mockReset().mockResolvedValue(undefined)
  })

  it('routes all declared email job types to handleEmailJob', async () => {
    const emailJobTypes = [
      'sendEmail',
      'send_release_email',
      'send_refund_email',
      'send_dispute_email',
      'send_payment_confirmed_email',
    ] as const

    for (const type of emailJobTypes) {
      await processJob(type as any, { data: { transactionId: 'txn_123', recipientEmail: 'a@example.com' } })
    }

    expect(mockedHandleEmailJob).toHaveBeenCalledTimes(emailJobTypes.length)
    expect(mockedHandleEmailJob.mock.calls.map((call) => call[0].type)).toEqual(emailJobTypes)
  })

  it('throws in production when qstash is missing', async () => {
    const originalNodeEnv = process.env.NODE_ENV
    const originalQstash = process.env.QSTASH_TOKEN

    process.env.NODE_ENV = 'production'
    process.env.QSTASH_TOKEN = ''

    jest.resetModules()
    const { enqueue } = await import('@/lib/jobs/queue')
    await expect(
      enqueue('sendEmail', { template: 'povprasevanje_confirmation', to: 'x@example.com' })
    ).rejects.toThrow(/QStash not configured in production/)

    process.env.NODE_ENV = originalNodeEnv
    process.env.QSTASH_TOKEN = originalQstash
  })
})
