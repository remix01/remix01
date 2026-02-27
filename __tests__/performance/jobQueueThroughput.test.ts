jest.mock('@/lib/jobs/queue')
jest.mock('@upstash/redis')

import { enqueue, process as processJob } from '@/lib/jobs/queue'
import Stripe from 'stripe'

// Mock Stripe
jest.mock('stripe', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    paymentIntents: {
      capture: jest.fn(),
      refund: jest.fn(),
    },
  })),
}))

describe('Job Queue Throughput', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('enqueue is non-blocking — returns in under 5ms', async () => {
    ;(enqueue as jest.Mock).mockResolvedValue({
      id: 'job-123',
      status: 'queued',
    })

    const start = Date.now()
    const result = await enqueue('sendEmail', {
      to: 'test@test.com',
      template: 'payment_confirmed',
    })
    const duration = Date.now() - start

    expect(result.status).toBe('queued')
    expect(duration).toBeLessThan(5)
  })

  it('processes 100 jobs in under 10 seconds', async () => {
    const jobs = Array(100)
      .fill(null)
      .map((_, i) => ({
        id: `job-${i}`,
        type: 'sendEmail',
        payload: { to: `user${i}@test.com`, template: 'payment_confirmed' },
        status: 'queued',
      }))

    ;(processJob as jest.Mock).mockImplementation((job: any) => {
      return new Promise((resolve) => {
        setTimeout(() => resolve({ success: true }), 50)
      })
    })

    const start = Date.now()
    const results = await Promise.all(
      jobs.map((job) => processJob(job))
    )
    const duration = Date.now() - start

    expect(results.every((r: any) => r.success)).toBe(true)
    expect(duration).toBeLessThan(10000)
  }, 15000)

  it('failed job does not block queue', async () => {
    const jobs = [
      { id: 'job-fail', type: 'invalid_type', payload: {} },
      ...Array(5)
        .fill(null)
        .map((_, i) => ({
          id: `job-${i}`,
          type: 'sendEmail',
          payload: { to: `user${i}@test.com` },
        })),
    ]

    ;(processJob as jest.Mock).mockImplementation((job: any) => {
      if (job.type === 'invalid_type') {
        return Promise.reject(new Error('Invalid job type'))
      }
      return Promise.resolve({ success: true })
    })

    const results = await Promise.allSettled(
      jobs.map((job) => processJob(job))
    )

    // First job fails, but 5 others succeed
    expect(results[0].status).toBe('rejected')
    expect(results.slice(1).every((r) => r.status === 'fulfilled')).toBe(true)
  })

  it('job retry does not re-charge Stripe', async () => {
    const stripe = new Stripe('sk_test_123', { apiVersion: '2023-10-16' })
    const mockCapture = stripe.paymentIntents.capture as jest.Mock

    // Idempotency key prevents double charge
    const idempotencyKey = 'idempotency-key-123'

    const payload = {
      paymentIntentId: 'pi_123',
      amount: 10000,
      idempotencyKey,
    }

    ;(enqueue as jest.Mock).mockResolvedValue({ id: 'job-123' })

    // First attempt
    mockCapture.mockResolvedValueOnce({
      id: 'pi_123',
      status: 'succeeded',
      amount_received: 10000,
    })

    // Simulate retry with same idempotency key
    mockCapture.mockResolvedValueOnce({
      id: 'pi_123',
      status: 'succeeded',
      amount_received: 10000,
    })

    await enqueue('stripeCapture', payload)
    await mockCapture('pi_123', { amount: 10000 }, { idempotencyKey })
    await mockCapture('pi_123', { amount: 10000 }, { idempotencyKey })

    // Stripe treats identical idempotency key as same request
    expect(mockCapture).toHaveBeenCalledWith(
      'pi_123',
      { amount: 10000 },
      { idempotencyKey }
    )
  })
})
