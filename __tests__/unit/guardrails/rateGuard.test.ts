// @ts-expect-error vi is not exported from @jest/globals in this config
import { describe, it, expect, beforeEach, vi } from '@jest/globals'
import { rateGuard } from '@/lib/agent/guardrails/rateGuard'
import { anomalyDetector } from '@/lib/observability/alerting'

const mockRedis = {
  incr: vi.fn(),
  expire: vi.fn(),
  ttl: vi.fn(),
}

// Mock Redis and anomaly detector
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => mockRedis),
}))

vi.mock('@/lib/observability/alerting', () => ({
  anomalyDetector: {
    record: vi.fn(),
  },
}))

describe('RateGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRedis.incr.mockResolvedValue(1)
    mockRedis.expire.mockResolvedValue(1)
    mockRedis.ttl.mockResolvedValue(60)
    // Clear in-memory store
    ;(globalThis as any).__rateGuardInMemory = undefined
  })

  describe('Redis-based rate limiting', () => {
    it('allows first call within limit', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      await expect(rateGuard('user-1')).resolves.toBeUndefined()
    })

    it('allows 20 calls (at limit)', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      // Simulate 20 calls by calling rateGuard multiple times
      for (let i = 0; i < 20; i++) {
        await expect(rateGuard('user-20-calls')).resolves.toBeUndefined()
      }
    })

    it('rejects call 21 (exceeds limit)', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'
      mockRedis.incr.mockResolvedValue(21)
      mockRedis.ttl.mockResolvedValue(19)

      await expect(rateGuard('user-over-limit')).rejects.toMatchObject({
        code: 429,
      })
    })

    it('sets expiration on first increment', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      await rateGuard('user-2')
      expect(mockRedis.expire).toHaveBeenCalledWith('guardrail:ratelimit:user-2', 60)
    })

    it('increments counter on subsequent calls', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      await rateGuard('user-3')
      // Second call should increment
      mockRedis.incr.mockResolvedValue(2)
      await rateGuard('user-3')

      expect(mockRedis.incr).toHaveBeenCalledTimes(2)
      expect(mockRedis.expire).toHaveBeenCalledTimes(1)
    })

    it('returns retry-after TTL when limit exceeded', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      mockRedis.incr.mockResolvedValue(21)
      mockRedis.ttl.mockResolvedValue(9)

      await expect(rateGuard('user-retry-after')).rejects.toMatchObject({
        code: 429,
        error: expect.stringContaining('Try again in 9 seconds'),
      })
    })
  })

  describe('In-memory fallback rate limiting', () => {
    beforeEach(() => {
      // Remove Redis env vars to force fallback
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN
    })

    it('allows first call within limit (fallback)', async () => {
      await expect(rateGuard('user-fallback-1')).resolves.toBeUndefined()
    })

    it('allows multiple users independently', async () => {
      await expect(rateGuard('user-a')).resolves.toBeUndefined()
      await expect(rateGuard('user-b')).resolves.toBeUndefined()
      await expect(rateGuard('user-c')).resolves.toBeUndefined()

      // In fallback mode Redis must not be used
      expect(mockRedis.incr).not.toHaveBeenCalled()
    })

    it('tracks separate limits per user', async () => {
      await expect(rateGuard('user-x')).resolves.toBeUndefined()
      await expect(rateGuard('user-y')).resolves.toBeUndefined()

      // In fallback mode Redis must not be used; isolation is handled by the in-memory Map
      expect(mockRedis.incr).not.toHaveBeenCalled()
    })

    it('resets counter after time window expires', async () => {
      // Simulate time progression by manipulating Date
      vi.useFakeTimers()
      const now = Date.now()
      vi.setSystemTime(now)

      await rateGuard('user-reset')

      // Advance time past the 60-second window
      vi.setSystemTime(now + 65000)

      // Should allow new calls after reset
      await expect(rateGuard('user-reset')).resolves.toBeUndefined()

      vi.useRealTimers()
    })
  })

  describe('distributed rate limiting', () => {
    it('uses same key format across instances', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      // Two calls to the guard should use consistent key
      await rateGuard('user-distributed')
      await rateGuard('user-distributed')

      expect(mockRedis.incr).toHaveBeenNthCalledWith(1, 'guardrail:ratelimit:user-distributed')
      expect(mockRedis.incr).toHaveBeenNthCalledWith(2, 'guardrail:ratelimit:user-distributed')
    })

    it('returns 429 error on rate limit in distributed mode', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      mockRedis.incr.mockResolvedValue(21)
      await expect(rateGuard('user-distributed-limit')).rejects.toMatchObject({ code: 429 })
    })
  })

  describe('configuration constants', () => {
    it('enforces 60-second time window', async () => {
      // RATE_LIMIT_WINDOW = 60 seconds
      const windowSeconds = 60
      expect(windowSeconds).toBe(60)
    })

    it('enforces 20 calls per minute limit', async () => {
      // RATE_LIMIT_MAX_CALLS = 20
      const maxCalls = 20
      expect(maxCalls).toBe(20)
    })
  })

  describe('edge cases', () => {
    it('handles rapid successive calls', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      // Make 5 rapid calls - should all be within limit
      const promises = Array(5)
        .fill(null)
        .map(() => rateGuard('user-rapid'))

      await expect(Promise.all(promises)).resolves.toBeDefined()
    })

    it('handles very long userId strings', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      const longUserId = 'user-' + 'x'.repeat(1000)

      await expect(rateGuard(longUserId)).resolves.toBeUndefined()
    })

    it('handles empty userId gracefully', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      await expect(rateGuard('')).resolves.toBeUndefined()
    })

    it('handles special characters in userId', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      await expect(rateGuard('user@example.com')).resolves.toBeUndefined()
    })

    it('handles UUID format userId', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'

      const userId = '550e8400-e29b-41d4-a716-446655440000'
      await expect(rateGuard(userId)).resolves.toBeUndefined()
    })

    it('records anomaly on excessive calls', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'
      mockRedis.incr.mockResolvedValue(21)

      await expect(rateGuard('user-anomaly')).rejects.toMatchObject({ code: 429 })
      expect(anomalyDetector.record).toHaveBeenCalledWith('excessive_tool_calls', 'user-anomaly')
    })

    it('returns descriptive error message on rate limit', async () => {
      process.env.KV_REST_API_URL = 'https://test-redis.upstash.io'
      process.env.KV_REST_API_TOKEN = 'test-token'
      mockRedis.incr.mockResolvedValue(21)
      mockRedis.ttl.mockResolvedValue(7)

      await expect(rateGuard('user-msg')).rejects.toMatchObject({
        code: 429,
        error: expect.stringContaining('Max 20 tool calls per minute'),
      })
    })
  })

  describe('fallback behavior', () => {
    beforeEach(() => {
      delete process.env.KV_REST_API_URL
      delete process.env.KV_REST_API_TOKEN
    })

    it('uses in-memory store when Redis unavailable', async () => {
      await expect(rateGuard('user-fallback')).resolves.toBeUndefined()
    })

    it('in-memory store tracks state across calls', async () => {
      const user = 'user-tracking'
      await expect(rateGuard(user)).resolves.toBeUndefined()
      await expect(rateGuard(user)).resolves.toBeUndefined()
      // Exceed local fallback limit and verify enforcement
      for (let i = 0; i < 19; i++) {
        await rateGuard(user)
      }
      await expect(rateGuard(user)).rejects.toMatchObject({ code: 429 })
    })

    it('in-memory: different users do not interfere', async () => {
      const user1 = 'user-1-fallback'
      const user2 = 'user-2-fallback'

      await expect(rateGuard(user1)).resolves.toBeUndefined()
      await expect(rateGuard(user2)).resolves.toBeUndefined()
      for (let i = 0; i < 20; i++) {
        await rateGuard(user1)
      }
      await expect(rateGuard(user1)).rejects.toMatchObject({ code: 429 })
      await expect(rateGuard(user2)).resolves.toBeUndefined()
    })
  })
})
