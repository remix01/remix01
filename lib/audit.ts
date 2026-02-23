import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * Actor types for audit logging
 */
export type Actor = 
  | 'system'
  | `customer:${string}`
  | `craftworker:${string}`
  | `admin:${string}`
  | 'stripe:webhook'

/**
 * Event types for audit logging
 */
export type AuditEventType =
  | 'payment.created'
  | 'payment.held'
  | 'payment.released'
  | 'payment.refunded'
  | 'payment.failed'
  | 'dispute.opened'
  | 'dispute.resolved'
  | 'job.completed'
  | 'job.cancelled'
  | 'transfer.created'
  | 'account.updated'

/**
 * Options for creating an audit log entry
 */
interface CreateAuditLogOptions {
  eventType: AuditEventType
  actor: Actor
  jobId?: string
  paymentId?: string
  stripeEventId?: string
  metadata?: Record<string, any>
}

/**
 * Create an audit log entry
 * 
 * @param options - Audit log options
 * @returns Created audit log or null if duplicate (idempotency)
 */
export async function createAuditLog(options: CreateAuditLogOptions) {
  const { eventType, actor, jobId, paymentId, stripeEventId, metadata } = options

  try {
    // Idempotency check: if stripeEventId exists, check if already processed
    if (stripeEventId) {
      const { data: existing, error: fetchError } = await supabaseAdmin
        .from('audit_log')
        .select('*')
        .eq('stripe_event_id', stripeEventId)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError
      if (existing) {
        console.log(`[audit] Duplicate Stripe event ${stripeEventId}, skipping`)
        return null
      }
    }

    // Create audit log entry
    const { data: auditLog, error } = await supabaseAdmin
      .from('audit_log')
      .insert({
        event_type: eventType,
        actor,
        job_id: jobId,
        payment_id: paymentId,
        stripe_event_id: stripeEventId,
        metadata: metadata,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)

    console.log(`[audit] ${eventType} by ${actor}`, { 
      auditLogId: auditLog.id,
      jobId,
      paymentId,
      stripeEventId,
    })

    return auditLog
  } catch (error) {
    console.error(`[audit] Failed to create audit log for ${eventType}:`, error)
    throw error
  }
}

/**
 * Check if a Stripe event has already been processed (idempotency)
 * 
 * @param stripeEventId - Stripe event ID
 * @returns true if event was already processed
 */
export async function isStripeEventProcessed(stripeEventId: string): Promise<boolean> {
  const { data: existing, error } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .eq('stripe_event_id', stripeEventId)
    .single()

  if (error && error.code !== 'PGRST116') throw new Error(error.message)
  return existing !== null
}

/**
 * Get audit logs for a job
 * 
 * @param jobId - Job ID
 * @returns Array of audit logs ordered by creation time
 */
export async function getJobAuditLogs(jobId: string) {
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Get audit logs for a payment
 * 
 * @param paymentId - Payment ID
 * @returns Array of audit logs ordered by creation time
 */
export async function getPaymentAuditLogs(paymentId: string) {
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .eq('payment_id', paymentId)
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Get recent audit logs for admin dashboard
 * 
 * @param limit - Maximum number of logs to return
 * @returns Array of recent audit logs
 */
export async function getRecentAuditLogs(limit: number = 50) {
  const { data, error } = await supabaseAdmin
    .from('audit_log')
    .select(`
      *,
      job:job_id(id, customer:customer_id(name), craftworker:craftworker_id(name)),
      payment:payment_id(id, amount, status)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return data
}
