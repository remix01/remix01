/**
 * Job Queue — Async side effects via Supabase
 * 
 * All escrow operations have side effects (emails, webhooks, auditing, etc).
 * This queue decouples them from the HTTP request so operations complete faster
 * and failures don't crash the main transaction.
 * 
 * Uses Supabase job_queue table + Edge Function (stripe-worker):
 * - Durable job storage (persisted in Supabase)
 * - pg_cron picks up jobs every minute
 * - stripe-worker Edge Function processes Stripe operations
 * - Automatic retries with exponential backoff
 * - Observable status tracking in database
 * - No external dependencies needed
 */

import { createClient } from '@/lib/supabase/server'

// ── TYPES
export type JobType =
  | 'stripeCapture'
  | 'stripeRelease'
  | 'stripeCancel'
  | 'stripeRefund'
  | 'sendEmail'
  | 'auditLog'
  | 'webhook'

export interface Job<T = any> {
  id: string
  type: JobType
  payload: T
  status: 'pending' | 'processing' | 'completed' | 'failed'
  attempts: number
  last_error?: string
  completed_at?: string
  created_at: string
}

/**
 * Add a job to the queue via Supabase. Returns job ID for tracking.
 * 
 * Usage:
 * ```ts
 * const jobId = await enqueue('stripeCapture', {
 *   paymentIntentId: 'pi_123',
 *   amount: 5000,
 * })
 * ```
 */
export async function enqueue<T extends Record<string, any>>(
  jobType: JobType,
  payload: T,
  options?: {
    delay?: number
    retries?: number
  }
): Promise<string> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('job_queue')
      .insert({
        type: jobType,
        payload,
        status: 'pending',
        attempts: 0,
      })
      .select('id')
      .single()

    if (error) {
      console.error('[Queue] Error enqueueing job:', jobType, error)
      throw error
    }

    console.log(`[JOB ENQUEUED] ${jobType} (${data.id})`, { payload })
    return data.id
  } catch (err) {
    console.error('[Queue] Failed to enqueue job:', jobType, err)
    throw err
  }
}

/**
 * Get current status of a job by ID.
 */
export async function getJobStatus(jobId: string): Promise<Job | null> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('id', jobId)
      .single()

    if (error) {
      console.error('[Queue] Error getting job status:', error)
      return null
    }

    return data as Job
  } catch (err) {
    console.error('[Queue] Failed to get job status:', jobId, err)
    return null
  }
}

/**
 * Get pending job count by type.
 */
export async function getQueueLength(type: JobType): Promise<number> {
  try {
    const supabase = createClient()
    
    const { count, error } = await supabase
      .from('job_queue')
      .select('*', { count: 'exact', head: true })
      .eq('type', type)
      .eq('status', 'pending')

    if (error) {
      console.error('[Queue] Error getting queue length:', error)
      return 0
    }

    return count ?? 0
  } catch (err) {
    console.error('[Queue] Failed to get queue length:', err)
    return 0
  }
}

/**
 * Get failed jobs.
 */
export async function getDeadLetterJobs(limit = 100): Promise<Job[]> {
  try {
    const supabase = createClient()
    
    const { data, error } = await supabase
      .from('job_queue')
      .select('*')
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('[Queue] Error getting dead letter jobs:', error)
      return []
    }

    return data as Job[]
  } catch (err) {
    console.error('[Queue] Failed to get dead letter jobs:', err)
    return []
  }
}

/**
 * Get queue statistics for monitoring.
 */
export async function getQueueStats(): Promise<{
  [key in JobType]: number
} & { dead_letter: number; total: number }> {
  try {
    const supabase = createClient()
    
    // Get counts for each job type
    const { data, error } = await supabase
      .from('job_queue')
      .select('type, status, count(*)', { count: 'exact' })
      .in('status', ['pending', 'failed'])
      .returns<Array<{ type: JobType; status: string; count: number }>>()

    if (error) {
      console.error('[Queue] Error getting queue stats:', error)
      return {
        stripeCapture: 0,
        stripeRelease: 0,
        stripeCancel: 0,
        stripeRefund: 0,
        sendEmail: 0,
        auditLog: 0,
        webhook: 0,
        dead_letter: 0,
        total: 0,
      }
    }

    const stats: any = {
      stripeCapture: 0,
      stripeRelease: 0,
      stripeCancel: 0,
      stripeRefund: 0,
      sendEmail: 0,
      auditLog: 0,
      webhook: 0,
      dead_letter: 0,
      total: 0,
    }

    if (data) {
      for (const row of data) {
        if (row.status === 'failed') {
          stats.dead_letter += row.count
        } else {
          stats[row.type] = (stats[row.type] ?? 0) + row.count
        }
        stats.total += row.count
      }
    }

    return stats
  } catch (err) {
    console.error('[Queue] Failed to get queue stats:', err)
    return {
      stripeCapture: 0,
      stripeRelease: 0,
      stripeCancel: 0,
      stripeRefund: 0,
      sendEmail: 0,
      auditLog: 0,
      webhook: 0,
      dead_letter: 0,
      total: 0,
    }
  }
}

/**
 * Clear queue (for testing) — be careful!
 */
export async function clearQueue(type: JobType): Promise<void> {
  try {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('job_queue')
      .delete()
      .eq('type', type)

    if (error) {
      console.error('[Queue] Error clearing queue:', error)
      throw error
    }

    console.warn(`[CLEAR QUEUE] Cleared all ${type} jobs`)
  } catch (err) {
    console.error('[Queue] Failed to clear queue:', err)
  }
}


