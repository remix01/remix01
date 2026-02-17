import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

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
      const existing = await prisma.auditLog.findUnique({
        where: { stripeEventId },
      })

      if (existing) {
        console.log(`[audit] Duplicate Stripe event ${stripeEventId}, skipping`)
        return null
      }
    }

    // Create audit log entry
    const auditLog = await prisma.auditLog.create({
      data: {
        eventType,
        actor,
        jobId,
        paymentId,
        stripeEventId,
        metadata: metadata as Prisma.JsonObject,
      },
    })

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
  const existing = await prisma.auditLog.findUnique({
    where: { stripeEventId },
  })

  return existing !== null
}

/**
 * Get audit logs for a job
 * 
 * @param jobId - Job ID
 * @returns Array of audit logs ordered by creation time
 */
export async function getJobAuditLogs(jobId: string) {
  return prisma.auditLog.findMany({
    where: { jobId },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Get audit logs for a payment
 * 
 * @param paymentId - Payment ID
 * @returns Array of audit logs ordered by creation time
 */
export async function getPaymentAuditLogs(paymentId: string) {
  return prisma.auditLog.findMany({
    where: { paymentId },
    orderBy: { createdAt: 'asc' },
  })
}

/**
 * Get recent audit logs for admin dashboard
 * 
 * @param limit - Maximum number of logs to return
 * @returns Array of recent audit logs
 */
export async function getRecentAuditLogs(limit: number = 50) {
  return prisma.auditLog.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    include: {
      job: {
        select: {
          id: true,
          customer: { select: { name: true } },
          craftworker: { select: { name: true } },
        },
      },
      payment: {
        select: {
          id: true,
          amount: true,
          status: true,
        },
      },
    },
  })
}
