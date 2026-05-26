import { supabaseAdmin } from '@/lib/supabase-admin'
import { Job } from '../queue'

/**
 * Log audit events (async job)
 * Runs after DB transaction commits
 * Idempotent: duplicate audit entries are acceptable (logged with unique IDs)
 */
export async function handleAuditLog(job: Job) {
  const { escrowId, event, userId, metadata } = job.data

  if (!escrowId || !event) {
    throw new Error('Missing escrowId or event in job data')
  }

  try {
    console.log(`[AUDIT] Logging event ${event} for escrow ${escrowId}`)

    const { error } = await supabaseAdmin
      .from('escrow_audit_log')
      .insert({
        transaction_id: escrowId,
        action: event,
        performed_by: userId ?? null,
        new_state: { actor: userId ?? 'system', ...(metadata ?? {}) } as import('@/types/supabase').Json,
        performed_at: new Date().toISOString(),
      })

    if (error) {
      console.error(`[AUDIT] Failed to log event: ${error.message}`)
      throw error
    }

    console.log(`[AUDIT] Successfully logged ${event} for escrow ${escrowId}`)
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[AUDIT] Failed to log audit event: ${errorMsg}`)
    throw err // Let queue handle retries
  }
}
