/**
 * Cron execution guard — shared protection for all Vercel cron routes.
 *
 * Provides in order:
 *   1. CRON_SECRET verification (consistent across all routes)
 *   2. Overlap lock — Redis SET NX EX prevents two instances of the same job
 *      running simultaneously (e.g. Vercel retry + regular invocation)
 *   3. Window idempotency — optional per-job; skips repeat runs within the
 *      same logical time bucket (hour / half-day / day) once a run succeeds
 *   4. Structured JSON logging at start / done / skip / error
 *   5. Unhandled-error catch — never propagates, returns 500 instead
 *
 * Lock backend: Upstash Redis (already used project-wide via getRedis()).
 * If Redis is unavailable the guard logs a warning and proceeds without a
 * lock — application-level idempotency (DB claim patterns, RPC idempotency)
 * remains the safety net for financial operations.
 *
 * Usage:
 *   export const GET = withCronGuard(
 *     { jobName: 'metrics-push', lockTtlSeconds: 90 },
 *     async (_req) => {
 *       // ... handler body, no auth check needed here
 *       return NextResponse.json({ ok: true })
 *     },
 *   )
 */

import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/cache/redis-client'

export interface CronGuardOptions {
  /** Stable unique name — becomes the Redis lock key suffix */
  jobName: string
  /**
   * Lock TTL in seconds.
   * Must be safely greater than the expected worst-case runtime.
   * Prevents a crashed run from blocking the job forever.
   */
  lockTtlSeconds: number
  /**
   * Optional: function that returns the current "window" key string.
   * When provided and Redis is available, once a run completes successfully
   * the window key is written to Redis with windowTtlSeconds TTL.
   * Any subsequent invocation within the same window returns a 200 no-op.
   * Use for jobs that must not repeat expensive work in the same period
   * (embedding calls, Stripe retries, anomaly alert inserts).
   */
  windowKey?: () => string
  /** TTL for the window completion marker. Should be < job interval. */
  windowTtlSeconds?: number
}

type Handler = (req: NextRequest) => Promise<NextResponse | Response>

/** Pre-built window-key helpers — import alongside withCronGuard as needed. */
export const cronWindow = {
  /** Current UTC hour: "2026-05-23T14" */
  hour: () => new Date().toISOString().slice(0, 13),
  /** Current UTC date: "2026-05-23" */
  day: () => new Date().toISOString().slice(0, 10),
  /** Current 12-hour UTC half: "2026-05-23:0" or "2026-05-23:1" */
  halfDay: () => {
    const d = new Date()
    return `${d.toISOString().slice(0, 10)}:${d.getUTCHours() < 12 ? 0 : 1}`
  },
}

export function withCronGuard(opts: CronGuardOptions, handler: Handler): Handler {
  const { jobName, lockTtlSeconds, windowKey, windowTtlSeconds } = opts
  const lockKey = `cron:lock:${jobName}`

  return async (req: NextRequest): Promise<NextResponse> => {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const cronSecret = process.env.CRON_SECRET
    const authHeader = req.headers.get('authorization')
    if (!cronSecret) {
      if (process.env.NODE_ENV === 'production') {
        cronLog('error', jobName, 'auth_fail', { reason: 'CRON_SECRET not configured' })
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      // dev/test: allow through without secret
    } else if (authHeader !== `Bearer ${cronSecret}`) {
      cronLog('warn', jobName, 'auth_fail')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const redis = getRedis()
    const start = Date.now()
    let lockAcquired = false

    try {
      // ── 2. Window idempotency ─────────────────────────────────────────────
      if (windowKey && windowTtlSeconds && redis) {
        const wKey = `cron:win:${windowKey()}`
        const alreadyDone = await redis.get(wKey).catch(() => null)
        if (alreadyDone !== null) {
          cronLog('info', jobName, 'skip:window', { wKey })
          return NextResponse.json({ ok: true, skipped: true, reason: 'window_completed' })
        }
      }

      // ── 3. Overlap lock ───────────────────────────────────────────────────
      if (redis) {
        const acquired = await redis
          .set(lockKey, '1', { nx: true, ex: lockTtlSeconds })
          .catch(() => null)
        if (acquired === null) {
          cronLog('warn', jobName, 'skip:locked')
          return NextResponse.json({ ok: true, skipped: true, reason: 'already_running' })
        }
        lockAcquired = true
      } else {
        cronLog('warn', jobName, 'no_redis:proceeding_unlocked')
      }

      cronLog('info', jobName, 'start')

      // ── 4. Execute ────────────────────────────────────────────────────────
      const response = await handler(req)

      // ── 5. Mark window complete (only on success) ─────────────────────────
      if (windowKey && windowTtlSeconds && redis && response.status < 400) {
        const wKey = `cron:win:${windowKey()}`
        await redis.set(wKey, '1', { ex: windowTtlSeconds }).catch(() => null)
      }

      cronLog('info', jobName, 'done', { ms: Date.now() - start, status: response.status })
      return response as NextResponse
    } catch (err) {
      cronLog('error', jobName, 'error', { ms: Date.now() - start, err: String(err) })
      return NextResponse.json({ error: 'cron_error', job: jobName }, { status: 500 })
    } finally {
      // Always release the lock, even if handler threw
      if (lockAcquired && redis) {
        await redis.del(lockKey).catch(() => null)
      }
    }
  }
}

function cronLog(
  level: 'info' | 'warn' | 'error',
  job: string,
  event: string,
  extra?: Record<string, unknown>,
) {
  const payload = JSON.stringify({ level, job, event, ts: new Date().toISOString(), ...extra })
  if (level === 'error') console.error(payload)
  else if (level === 'warn') console.warn(payload)
  else console.log(payload)
}
