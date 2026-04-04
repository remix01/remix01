/**
 * Task Processor Worker — Orchestrator Job Handlers
 * 
 * Processes all orchestrator-generated jobs:
 * - match_request: Run matching algorithm and update task status
 * - notify_partners: Send notifications to matched partners
 * - create_escrow: Create payment escrow
 * - release_escrow: Release escrow payment
 * - cancel_escrow: Cancel/refund escrow
 * - activate_guarantee: Trigger SLA guarantee
 * - task_started: Update task timeline
 * - request_review: Request customer review
 */

import { Job } from '../queue'
import { taskOrchestrator } from '@/lib/services/taskOrchestrator'
import { matchingService } from '@/lib/services/matchingService'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enqueue } from '../queue'
import type { Database } from '@/types/supabase'

type ObrtnikiRow = Database['public']['Tables']['obrtniki']['Row']
type ServiceRequestsRow = Database['public']['Tables']['service_requests']['Row']
type PonudbeRow = Database['public']['Tables']['ponudbe']['Row']

/**
 * Handle match_request job
 * Runs matching algorithm and updates task status
 */
export async function handleMatchRequest(job: Job): Promise<void> {
  try {
    const { taskId, requestId, lat, lng, categoryId } = job.data

    console.log('[TaskProcessor] Processing match_request', { taskId })

    // Run matching algorithm
    const matches = await matchingService.findMatches(
      requestId,
      lat,
      lng,
      categoryId,
      taskId
    )

    // Update task to 'matched' status
    const matchIds = (matches.matches ?? []).map((m) => m.partnerId)
    await taskOrchestrator.updateTaskStatus(taskId, 'matched', {
      matchIds,
    })

    console.log(`[TaskProcessor] Matched ${matches.matches?.length || 0} partners for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] match_request error:', err)
    throw err
  }
}

/**
 * Handle notify_partners job
 * Send notifications to matched partners
 */
export async function handleNotifyPartners(job: Job): Promise<void> {
  try {
    const { taskId, matchIds } = job.data

    console.log('[TaskProcessor] Notifying partners for task', { taskId, matchCount: matchIds?.length })

    // Fetch task and match details
    const { data: task } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', taskId)
      .single()

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    // Fetch matched partners
    if (matchIds && matchIds.length > 0) {
      const { data: partners } = await supabaseAdmin
        .from('obrtniki')
        .select('*')
        .in('id', matchIds)

      // Enqueue email notifications for each partner
      const partnersList = (partners ?? []) as ObrtnikiRow[]
      for (const partner of partnersList) {
        await enqueue('sendEmail', {
          to: partner.email ?? '',
          template: 'new_match',
          data: {
            partnerName: partner.ime ?? 'Partner',
            taskTitle: (task as ServiceRequestsRow).title ?? 'Unknown Task',
            taskId,
          },
        })
      }
    }

    console.log(`[TaskProcessor] Notified partners for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] notify_partners error:', err)
    throw err
  }
}

/**
 * Handle create_escrow job
 * Create payment escrow for accepted offer
 */
export async function handleCreateEscrow(job: Job): Promise<void> {
  try {
    const { taskId, offerId, amount } = job.data

    console.log('[TaskProcessor] Creating escrow for task', { taskId, offerId, amount })

    // Fetch offer and task details
    const { data: offer } = await supabaseAdmin
      .from('ponudbe')
      .select('*')
      .eq('id', offerId)
      .single()

    const { data: task } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', taskId)
      .single()

    if (!offer || !task) {
      throw new Error(`Offer ${offerId} or Task ${taskId} not found`)
    }

    const typedOffer = offer as PonudbeRow
    const typedTask = task as ServiceRequestsRow

    // Enqueue Stripe capture to hold funds
    await enqueue('stripeCapture', {
      taskId,
      offerId,
      amount: amount || typedOffer.price_estimate,
      customerEmail: typedTask.id,
    })

    console.log(`[TaskProcessor] Escrow job enqueued for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] create_escrow error:', err)
    throw err
  }
}

/**
 * Handle release_escrow job
 * Release escrow payment to craftworker
 */
export async function handleReleaseEscrow(job: Job): Promise<void> {
  try {
    const { taskId } = job.data

    console.log('[TaskProcessor] Releasing escrow for task', { taskId })

    // Fetch offer details
    const { data: task } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', taskId)
      .single()

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const typedTask = task as ServiceRequestsRow

    // Enqueue Stripe release
    await enqueue('stripeRelease', {
      taskId,
      amount: 0,
    })

    console.log(`[TaskProcessor] Escrow release job enqueued for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] release_escrow error:', err)
    throw err
  }
}

/**
 * Handle cancel_escrow job
 * Cancel/refund escrow (on cancellation)
 */
export async function handleCancelEscrow(job: Job): Promise<void> {
  try {
    const { taskId } = job.data

    console.log('[TaskProcessor] Cancelling escrow for task', { taskId })

    // Enqueue Stripe refund
    await enqueue('stripeCancel', {
      taskId,
    })

    console.log(`[TaskProcessor] Escrow cancellation job enqueued for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] cancel_escrow error:', err)
    throw err
  }
}

/**
 * Handle activate_guarantee job
 * Trigger SLA guarantee if task expired
 */
export async function handleActivateGuarantee(job: Job): Promise<void> {
  try {
    const { taskId } = job.data

    console.log('[TaskProcessor] Activating guarantee for task', { taskId })

    // Update task metadata to mark guarantee as active
    const { error } = await supabaseAdmin
      .from('service_requests')
      .update({
        guarantee_activated: true,
        guarantee_activated_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (error) {
      throw error
    }

    // Enqueue notification to customer
    await enqueue('sendEmail', {
      template: 'guarantee_activated',
      data: { taskId },
    })

    console.log(`[TaskProcessor] Guarantee activated for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] activate_guarantee error:', err)
    throw err
  }
}

/**
 * Handle task_started job
 * Update task timeline when work begins
 */
export async function handleTaskStarted(job: Job): Promise<void> {
  try {
    const { taskId } = job.data

    console.log('[TaskProcessor] Marking task as started', { taskId })

    // Update task started_at
    const { error } = await supabaseAdmin
      .from('service_requests')
      .update({
        started_at: new Date().toISOString(),
      })
      .eq('id', taskId)

    if (error) {
      throw error
    }

    console.log(`[TaskProcessor] Task ${taskId} marked as started`)
  } catch (err) {
    console.error('[TaskProcessor] task_started error:', err)
    throw err
  }
}

/**
 * Handle request_review job
 * Request customer review after completion
 */
export async function handleRequestReview(job: Job): Promise<void> {
  try {
    const { taskId } = job.data

    console.log('[TaskProcessor] Requesting review for task', { taskId })

    // Fetch task and customer email
    const { data: task } = await supabaseAdmin
      .from('service_requests')
      .select('*')
      .eq('id', taskId)
      .single()

    if (!task) {
      throw new Error(`Task ${taskId} not found`)
    }

    const typedTask = task as ServiceRequestsRow

    // Enqueue review request email
    await enqueue('sendEmail', {
      to: typedTask.id,
      template: 'request_review',
      data: {
        taskId,
        taskTitle: typedTask.id,
      },
    })

    console.log(`[TaskProcessor] Review request enqueued for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] request_review error:', err)
    throw err
  }
}
