// @ts-expect-error vi is not exported from @jest/globals in this config
import { describe, it, expect, beforeEach, vi } from '@jest/globals'

// Mock Redis before importing the module under test
const mockMget = vi.fn()
const mockIncr = vi.fn()
const mockIncrby = vi.fn()
const mockExpire = vi.fn()
const mockSet = vi.fn()
const mockGet = vi.fn()

vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => ({
    mget: mockMget,
    incr: mockIncr,
    incrby: mockIncrby,
    expire: mockExpire,
    set: mockSet,
    get: mockGet,
  })),
}))

vi.mock('../../../lib/cache/redis-client', () => ({
  getRedis: vi.fn().mockReturnValue({
    mget: mockMget,
    incr: mockIncr,
    incrby: mockIncrby,
    expire: mockExpire,
    set: mockSet,
    get: mockGet,
  }),
  executeRedisOperation: vi.fn(async (fn: (redis: unknown) => unknown) =>
    fn({
      mget: mockMget,
      incr: mockIncr,
      incrby: mockIncrby,
      expire: mockExpire,
      set: mockSet,
      get: mockGet,
    })
  ),
}))

vi.mock('../../../lib/cache/cache-keys', () => ({
  CACHE_KEYS: {
    jobStatus: (id: string) => `queue:job:${id}`,
  },
  CACHE_TTL: {
    VERY_LONG: 604800,
  },
}))

import { getQueueStatistics } from '../../../lib/queue/job-monitoring'

describe('getQueueStatistics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns zero averageProcessingTime when no completed jobs', async () => {
    // All counters zero, including processing_time_ms
    mockMget.mockResolvedValue(['0', '0', '0', '0', '0'])

    const stats = await getQueueStatistics('sendEmail')

    expect(stats.averageProcessingTime).toBe(0)
    expect(stats.completed).toBe(0)
  })

  it('calculates averageProcessingTime correctly from real timing data', async () => {
    // completed=4, processing_time_ms=8000 → average = 2000 ms
    mockMget.mockResolvedValue(['0', '0', '4', '0', '8000'])

    const stats = await getQueueStatistics('sendEmail')

    expect(stats.completed).toBe(4)
    expect(stats.averageProcessingTime).toBe(2000)
    expect(stats.averageProcessingTime).not.toBe(0)
  })

  it('averageProcessingTime is not always zero when timing data exists', async () => {
    // Regression: previous bug hardcoded averageProcessingTime to 0
    mockMget.mockResolvedValue(['0', '0', '10', '0', '50000'])

    const stats = await getQueueStatistics('sendEmail')

    expect(stats.averageProcessingTime).toBe(5000)
    expect(stats.averageProcessingTime).not.toBe(0)
  })

  it('sums processing times across multiple job types', async () => {
    // No specific type → queries sendEmail, webhook, stripe_capture_payment
    // Each returns: pending=1, processing=0, completed=2, failed=0, time_ms=4000
    mockMget.mockResolvedValue(['1', '0', '2', '0', '4000'])

    const stats = await getQueueStatistics()

    // 3 types × 2 completed = 6, 3 types × 4000ms = 12000ms → avg = 2000ms
    expect(stats.completed).toBe(6)
    expect(stats.averageProcessingTime).toBe(2000)
  })

  it('computes correct failureRate from real counts', async () => {
    // completed=8, failed=2 → totalJobs=10, failureRate=0.2
    mockMget.mockResolvedValue(['0', '0', '8', '2', '0'])

    const stats = await getQueueStatistics('sendEmail')

    expect(stats.failureRate).toBeCloseTo(0.2)
    expect(stats.totalJobs).toBe(10)
  })

  it('returns all-zero stats on Redis failure', async () => {
    mockMget.mockRejectedValue(new Error('Redis connection error'))

    const { executeRedisOperation } = await import('../../../lib/cache/redis-client')
    // When Redis fails, executeRedisOperation returns the fallback value
    ;(executeRedisOperation as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalJobs: 0,
      averageProcessingTime: 0,
      failureRate: 0,
    })

    const stats = await getQueueStatistics('sendEmail')

    expect(stats.averageProcessingTime).toBe(0)
    expect(stats.totalJobs).toBe(0)
  })
})
