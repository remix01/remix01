import { processJob } from '@/lib/jobs/processor'

const handleWebhook = jest.fn(async (_job: any) => undefined)
const handleStripeJob = jest.fn(async (_job: any) => undefined)

jest.mock('@/lib/jobs/workers/stripeCapture', () => ({ handleStripeCapture: jest.fn(async () => undefined) }))
jest.mock('@/lib/jobs/workers/stripeRelease', () => ({ handleStripeRelease: jest.fn(async () => undefined) }))
jest.mock('@/lib/jobs/workers/stripeCancel', () => ({ handleStripeCancel: jest.fn(async () => undefined) }))
jest.mock('@/lib/jobs/workers/emailWorker', () => ({ handleEmailJob: jest.fn(async () => undefined) }))
jest.mock('@/lib/jobs/workers/auditLogger', () => ({ handleAuditLog: jest.fn(async () => undefined) }))
jest.mock('@/lib/jobs/workers/webhookWorker', () => ({ handleWebhook: (job: any) => handleWebhook(job) }))
jest.mock('@/lib/jobs/workers/taskProcessor', () => ({
  handleMatchRequest: jest.fn(async () => undefined),
  handleNotifyPartners: jest.fn(async () => undefined),
  handleCreateEscrow: jest.fn(async () => undefined),
  handleReleaseEscrow: jest.fn(async () => undefined),
  handleCancelEscrow: jest.fn(async () => undefined),
  handleActivateGuarantee: jest.fn(async () => undefined),
  handleTaskStarted: jest.fn(async () => undefined),
  handleRequestReview: jest.fn(async () => undefined),
}))
jest.mock('@/lib/jobs/workers/agentSchedulePropose', () => ({ handleAgentSchedulePropose: jest.fn(async () => undefined) }))
jest.mock('@/lib/jobs/workers/agentVideoAnalyze', () => ({ handleAgentVideoAnalyze: jest.fn(async () => undefined) }))
jest.mock('@/lib/jobs/workers/stripeWorker', () => ({ handleStripeJob: (job: any) => handleStripeJob(job) }))

describe('processJob active routing', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('routes webhook_escrow_status_changed to webhook worker', async () => {
    await processJob('webhook_escrow_status_changed', { data: { transactionId: 'txn_1', statusBefore: 'paid', statusAfter: 'released' } })
    expect(handleWebhook).toHaveBeenCalledTimes(1)
  })

  it('routes stripe_capture_payment to stripe worker', async () => {
    await processJob('stripe_capture_payment', { data: { transactionId: 'txn_1', paymentIntentId: 'pi_1' } })
    expect(handleStripeJob).toHaveBeenCalledWith({ data: { transactionId: 'txn_1', paymentIntentId: 'pi_1' }, type: 'stripe_capture_payment' })
  })

  it('routes stripe_refund_payment to stripe worker', async () => {
    await processJob('stripe_refund_payment', { data: { transactionId: 'txn_1', paymentIntentId: 'pi_1' } })
    expect(handleStripeJob).toHaveBeenCalledWith({ data: { transactionId: 'txn_1', paymentIntentId: 'pi_1' }, type: 'stripe_refund_payment' })
  })

  it('fails fast for stripe_release_payment until worker exists', async () => {
    await expect(processJob('stripe_release_payment', { data: { escrowId: 'esc_1' } } as any)).rejects.toThrow(
      '[JOBS] Handler not implemented for active job type: stripe_release_payment'
    )
  })



  it('covers all actively enqueued job types without unknown-job fallthrough', async () => {
    const activeTypes: Array<{ type: any; shouldFailFast?: boolean }> = [
      { type: 'sendEmail' },
      { type: 'send_dispute_email' },
      { type: 'send_refund_email' },
      { type: 'send_release_email' },
      { type: 'send_payment_confirmed_email' },
      { type: 'webhook_escrow_status_changed' },
      { type: 'match_request' },
      { type: 'notify_partners' },
      { type: 'create_escrow' },
      { type: 'task_started' },
      { type: 'release_escrow' },
      { type: 'request_review' },
      { type: 'activate_guarantee' },
      { type: 'cancel_escrow' },
      { type: 'stripeCapture' },
      { type: 'stripeRelease' },
      { type: 'stripeCancel' },
      { type: 'stripe_capture_payment' },
      { type: 'stripe_refund_payment' },
      { type: 'stripe_release_payment', shouldFailFast: true },
      { type: 'notify_dispute_resolved', shouldFailFast: true },
    ]

    for (const item of activeTypes) {
      const promise = processJob(item.type, { data: { transactionId: 'txn_test', escrowId: 'esc_test' } } as any)
      if (item.shouldFailFast) {
        await expect(promise).rejects.toThrow('Handler not implemented')
      } else {
        await expect(promise).resolves.toBeUndefined()
      }
    }
  })

  it('fails fast for notify_dispute_resolved until worker exists', async () => {
    await expect(processJob('notify_dispute_resolved', { data: { recipientEmail: 'a@example.com' } } as any)).rejects.toThrow(
      '[JOBS] Handler not implemented for active job type: notify_dispute_resolved'
    )
  })
})
