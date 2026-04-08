/**
 * Enhanced Job Queue Monitoring
 *
 * Track job status, monitor queue depth, and collect metrics
 * Integrates with existing QStash queue system
 */

import { getRedis, executeRedisOperation } from '../cache/redis-client'
import { CACHE_KEYS, CACHE_TTL } from '../cache/cache-keys'
import type { JobType } from '../jobs/queue'

export interface JobStatus {
  jobId: string
  jobType: JobType
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
  createdAt: number
  startedAt?: number
  completedAt?: number
  error?: string
  retryCount: number
  maxRetries: number
}

export interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  totalJobs: number
  averageProcessingTime: number
  failureRate: number
}

/**
 * Track a job in Redis for monitoring
 */
export async function trackJobStatus(
  jobId: string,
  jobType: JobType,
  status: JobStatus['status'],
  metadata?: Partial<JobStatus>
): Promise<void> {
  const cacheKey = CACHE_KEYS.jobStatus(jobId)

  const jobStatus: JobStatus = {
    jobId,
    jobType,
    status,
    createdAt: metadata?.createdAt || Date.now(),
    startedAt: metadata?.startedAt,
    completedAt: metadata?.completedAt,
    error: metadata?.error,
    retryCount: metadata?.retryCount || 0,
    maxRetries: metadata?.maxRetries || 3,
  }

  // Keep job status for 7 days
  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(jobStatus), { ex: CACHE_TTL.VERY_LONG })
    },
    undefined,
    `job:track:${jobId}`
  )

  // Also track in a queue stats counter
  await incrementJobCounter(jobType, status)
}

/**
 * Get job status
 */
export async function getJobStatus(jobId: string): Promise<JobStatus | null> {
  const cacheKey = CACHE_KEYS.jobStatus(jobId)

  return executeRedisOperation(
    async (redis) => {
      const data = await redis.get<string>(cacheKey)
      if (!data) return null

      try {
        return JSON.parse(data) as JobStatus
      } catch {
        return null
      }
    },
    null,
    `job:get-status:${jobId}`
  )
}

/**
 * Mark job as completed
 */
export async function completeJob(jobId: string): Promise<void> {
  const status = await getJobStatus(jobId)

  if (!status) return

  const cacheKey = CACHE_KEYS.jobStatus(jobId)
  const updated: JobStatus = {
    ...status,
    status: 'completed',
    completedAt: Date.now(),
  }

  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(updated), { ex: CACHE_TTL.VERY_LONG })
    },
    undefined,
    `job:complete:${jobId}`
  )

  if (status.startedAt) {
    await recordProcessingTime(status.jobType, Date.now() - status.startedAt)
  }
}

/**
 * Mark job as failed
 */
export async function failJob(jobId: string, error: string): Promise<void> {
  const status = await getJobStatus(jobId)

  if (!status) return

  const cacheKey = CACHE_KEYS.jobStatus(jobId)
  const updated: JobStatus = {
    ...status,
    status: 'failed',
    error,
    completedAt: Date.now(),
  }

  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(updated), { ex: CACHE_TTL.VERY_LONG })
    },
    undefined,
    `job:fail:${jobId}`
  )
}

/**
 * Mark job as processing
 */
export async function startProcessingJob(jobId: string): Promise<void> {
  const status = await getJobStatus(jobId)

  if (!status) return

  const cacheKey = CACHE_KEYS.jobStatus(jobId)
  const updated: JobStatus = {
    ...status,
    status: 'processing',
    startedAt: Date.now(),
  }

  await executeRedisOperation(
    async (redis) => {
      await redis.set(cacheKey, JSON.stringify(updated), { ex: CACHE_TTL.VERY_LONG })
    },
    undefined,
    `job:start:${jobId}`
  )
}

/**
 * Increment job counter for statistics
 */
async function incrementJobCounter(jobType: JobType, status: JobStatus['status']): Promise<void> {
  const key = `queue:stats:${jobType}:${status}:${new Date().toISOString().split('T')[0]}`

  await executeRedisOperation(
    async (redis) => {
      await redis.incr(key)
      await redis.expire(key, CACHE_TTL.VERY_LONG)
    },
    undefined,
    `queue:counter:${jobType}:${status}`
  )
}

/**
 * Get queue statistics
 */
export async function getQueueStatistics(jobType?: JobType): Promise<QueueStats> {
  return executeRedisOperation(
    async (redis) => {
      const now = new Date().toISOString().split('T')[0]
      const types: JobType[] = jobType ? [jobType] : ['sendEmail', 'webhook', 'stripe_capture_payment']

      let pending = 0
      let processing = 0
      let completed = 0
      let failed = 0
      let totalProcessingTimeMs = 0

      for (const type of types) {
        const pendingKey = `queue:stats:${type}:pending:${now}`
        const processingKey = `queue:stats:${type}:processing:${now}`
        const completedKey = `queue:stats:${type}:completed:${now}`
        const failedKey = `queue:stats:${type}:failed:${now}`
        const processingTimeKey = `queue:stats:${type}:processing_time_ms:${now}`

        const counts = await redis.mget(
          pendingKey,
          processingKey,
          completedKey,
          failedKey,
          processingTimeKey
        ) as Array<string | null>

        pending += parseInt(counts[0] || '0', 10)
        processing += parseInt(counts[1] || '0', 10)
        completed += parseInt(counts[2] || '0', 10)
        failed += parseInt(counts[3] || '0', 10)
        totalProcessingTimeMs += parseInt(counts[4] || '0', 10)
      }

      const totalJobs = pending + processing + completed + failed
      const failureRate = totalJobs > 0 ? failed / totalJobs : 0
      const averageProcessingTime = completed > 0 ? totalProcessingTimeMs / completed : 0

      return {
        pending,
        processing,
        completed,
        failed,
        totalJobs,
        averageProcessingTime,
        failureRate,
      }
    },
    {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalJobs: 0,
      averageProcessingTime: 0,
      failureRate: 0,
    },
    `queue:stats`
  )
}

/**
 * Get recent failed jobs
 */
export async function getRecentFailedJobs(limit: number = 100): Promise<JobStatus[]> {
  const redis = getRedis()

  if (!redis) return []

  try {
    let cursor = '0'
    const failedJobs: JobStatus[] = []

    do {
      const scanResult = await redis.scan(parseInt(cursor), {
        match: 'queue:job:*',
        count: 100,
      })

      cursor = scanResult[0]
      const keys = (scanResult[1] as string[]) || []

      for (const key of keys) {
        const data = await redis.get<string>(key)
        if (data) {
          try {
            const job = JSON.parse(data) as JobStatus
            if (job.status === 'failed') {
              failedJobs.push(job)
            }
          } catch {
            // Skip parsing errors
          }
        }
      }

      if (failedJobs.length >= limit) break
    } while (cursor !== '0')

    return failedJobs.slice(0, limit).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
  } catch (err) {
    console.error('[Queue] Failed to get failed jobs:', err)
    return []
  }
}

/**
 * Record processing duration for completed jobs (in milliseconds)
 */
export async function recordProcessingTime(jobType: JobType, durationMs: number): Promise<void> {
  const key = `queue:stats:${jobType}:processing_time_ms:${new Date().toISOString().split('T')[0]}`
  const safeDuration = Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : 0

  if (safeDuration <= 0) return

  await executeRedisOperation(
    async (redis) => {
      await redis.incrby(key, safeDuration)
      await redis.expire(key, CACHE_TTL.VERY_LONG)
    },
    undefined,
    `queue:processing-time:${jobType}`
  )
}
