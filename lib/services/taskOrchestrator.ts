/**
 * Task Orchestrator — Lifecycle ↔ Queue Integration
 * 
 * Central coordination point for all task status changes and job scheduling.
 * Implements a state machine to ensure valid status transitions and trigger
 * appropriate side effects (job enqueuing) at each state.
 * 
 * Emits events for each status transition so subscribers can react.
 * NEVER call task status updates outside this service — always use orchestrator.updateTaskStatus()
 */

import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enqueue, type JobType } from '@/lib/jobs'
import { ServiceError } from './serviceError'
import { eventBus } from '@/lib/events'

// ── TYPES & STATE MACHINE

export type TaskStatus =
  | 'pending'       // Oddano, čaka matching
  | 'matching'      // Auto-matching teče
  | 'matched'       // Najdeni partnerji, čaka ponudbo
  | 'offer_sent'    // Partner poslal ponudbo
  | 'accepted'      // Stranka sprejela
  | 'in_progress'   // Delo poteka
  | 'completed'     // Zaključeno, čaka oceno
  | 'expired'       // 2h garancija kršena
  | 'cancelled'     // Preklicano

export interface CreateTaskInput {
  requestId: string
  lat: number
  lng: number
  categoryId: string
  userId: string
}

export interface Task {
  id: string
  requestId: string
  status: TaskStatus
  lat: number
  lng: number
  categoryId: string
  userId: string
  createdAt: string
  updatedAt: string
}

// Valid state transitions — guards against invalid status flows
const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending:     ['matching', 'cancelled'],
  matching:    ['matched', 'expired'],
  matched:     ['offer_sent', 'expired', 'cancelled'],
  offer_sent:  ['accepted', 'matched', 'expired'],
  accepted:    ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed:   [],
  expired:     ['matching'],
  cancelled:   [],
}

// ── ORCHESTRATOR

export const taskOrchestrator = {
  /**
   * Create a new task and initialize the matching pipeline
   */
  async createTask(data: CreateTaskInput): Promise<Task> {
    const supabase = await createClient()

    // Verify user owns the request
    const { data: request, error: requestError } = await supabase
      .from('povprasevanja')
      .select('id, narocnik_id')
      .eq('id', data.requestId)
      .single()

    if (requestError || !request) {
      throw new ServiceError(
        'Povpraševanja ni bilo mogoče naložiti',
        'NOT_FOUND',
        404
      )
    }

    if (request.narocnik_id !== data.userId) {
      throw new ServiceError(
        'Nimate dostopa do tega povpraševanja',
        'FORBIDDEN',
        403
      )
    }

    // Create task record with initial status
    const { data: task, error: insertError } = await supabaseAdmin
      .from('service_requests')
      .insert({
        povprasevanje_id: data.requestId,
        status: 'pending',
        lat: data.lat,
        lng: data.lng,
        category_id: data.categoryId,
        user_id: data.userId,
      })
      .select()
      .single()

    if (insertError || !task) {
      throw new ServiceError(
        'Napaka pri ustvarjanju naloge',
        'DB_ERROR',
        500
      )
    }

    // Enqueue initial matching job
    try {
      await enqueue('match_request', {
        taskId: task.id,
        requestId: data.requestId,
        lat: data.lat,
        lng: data.lng,
        categoryId: data.categoryId,
      })
    } catch (err) {
      console.error('[Orchestrator] Failed to enqueue matching job:', err)
      // Continue anyway — job can be retried manually
    }

    // Emit task.created event for subscribers
    await eventBus.emit('task.created', {
      taskId: task.id,
      customerId: data.userId,
      categoryId: data.categoryId,
      lat: data.lat,
      lng: data.lng,
      createdAt: task.created_at,
    })

    return {
      id: task.id,
      requestId: data.requestId,
      status: task.status as TaskStatus,
      lat: task.lat,
      lng: task.lng,
      categoryId: task.category_id,
      userId: task.user_id,
      createdAt: task.created_at,
      updatedAt: task.updated_at,
    }
  },

  /**
   * Central point for all task status transitions
   * Validates state machine rules and enqueues side-effect jobs
   */
  async updateTaskStatus(
    taskId: string,
    newStatus: TaskStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    const supabase = await createClient()

    // Fetch current task
    const { data: task, error: fetchError } = await supabaseAdmin
      .from('service_requests')
      .select('id, status, povprasevanje_id')
      .eq('id', taskId)
      .single()

    if (fetchError || !task) {
      throw new ServiceError(
        'Naloga ni bila najdena',
        'NOT_FOUND',
        404
      )
    }

    const currentStatus = task.status as TaskStatus

    // Validate state transition
    if (!VALID_TRANSITIONS[currentStatus]?.includes(newStatus)) {
      throw new ServiceError(
        `Neveljaven prehod stanja: ${currentStatus} → ${newStatus}`,
        'CONFLICT',
        400
      )
    }

    // Update status in database
    const { error: updateError } = await supabaseAdmin
      .from('service_requests')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString(),
        ...(metadata && { metadata }),
      })
      .eq('id', taskId)

    if (updateError) {
      throw new ServiceError(
        'Napaka pri posodobitvi naloge',
        'DB_ERROR',
        500
      )
    }

    console.log(`[Orchestrator] Task ${taskId} status: ${currentStatus} → ${newStatus}`)

    // Emit status-change events
    switch (newStatus) {
      case 'matched':
        await eventBus.emit('task.matched', {
          taskId,
          matchIds: metadata?.matchIds ?? [],
          topPartnerId: metadata?.topPartnerId ?? '',
          topScore: metadata?.topScore ?? 0,
          matchedAt: new Date().toISOString(),
          deadlineAt: metadata?.deadlineAt ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        })
        break

      case 'accepted':
        await eventBus.emit('task.accepted', {
          taskId,
          customerId: metadata?.customerId ?? '',
          partnerId: metadata?.partnerId ?? '',
          offerId: metadata?.offerId ?? '',
          agreedPrice: metadata?.agreedPrice ?? 0,
          acceptedAt: new Date().toISOString(),
        })
        break

      case 'completed':
        await eventBus.emit('task.completed', {
          taskId,
          customerId: metadata?.customerId ?? '',
          partnerId: metadata?.partnerId ?? '',
          completedAt: new Date().toISOString(),
          finalPrice: metadata?.finalPrice ?? 0,
        })
        break
    }

    // Trigger side effects based on new status
    await taskOrchestrator.enqueueSideEffects(taskId, newStatus, metadata)
  },

  /**
   * Enqueue jobs based on status transition
   */
  async enqueueSideEffects(
    taskId: string,
    status: TaskStatus,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      switch (status) {
        case 'matching':
          // Already enqueued in createTask, but can be re-triggered
          await enqueue('match_request', { taskId })
          break

        case 'matched':
          // Notify partners that matching is complete
          await enqueue('notify_partners', {
            taskId,
            matchIds: metadata?.matchIds,
          })
          break

        case 'accepted':
          // Create escrow for payment
          await enqueue('create_escrow', {
            taskId,
            offerId: metadata?.offerId,
            amount: metadata?.amount,
          })
          break

        case 'in_progress':
          // Update task timeline — work has started
          await enqueue('task_started', {
            taskId,
          })
          break

        case 'completed':
          // Release escrow and request review
          await enqueue('release_escrow', { taskId })
          await enqueue('request_review', { taskId })
          break

        case 'expired':
          // Trigger SLA guarantee payout
          await enqueue('activate_guarantee', { taskId })
          break

        case 'cancelled':
          // Refund escrow if held
          await enqueue('cancel_escrow', { taskId })
          break
      }
    } catch (err) {
      console.error('[Orchestrator] Failed to enqueue side effects:', err)
      // Don't throw — status update already succeeded
    }
  },

  /**
   * Get current task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    const { data: task } = await supabaseAdmin
      .from('service_requests')
      .select('status')
      .eq('id', taskId)
      .single()

    return task?.status as TaskStatus || null
  },
}
