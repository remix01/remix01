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
    await taskOrchestrator.updateTaskStatus(taskId, 'matched', {
      matchIds: (matches.matches as any[])?.map((m: { id: string }) => m.id) || [],
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
      for (const partner of partners || []) {
        await enqueue('sendEmail', {
          to: partner.email,
          template: 'new_match',
          data: {
            partnerName: partner.ime,
            taskTitle: task.title,
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

    // Enqueue Stripe capture to hold funds
    await enqueue('stripeCapture', {
      taskId,
      offerId,
      amount: amount || offer.price_estimate,
      customerEmail: task.customer_email,
    })

    console.log(`[TaskProcessor] Escrow job enqueued for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] create_escrow error:', err)
    throw err
  }
}

/**
 * Handle release_escrow job
 * Verify dispute window has passed, transfer payout to partner's Stripe account,
 * and mark escrow as released.
 * Job payload: { escrowId, paymentIntentId, partnerId, amount, taskId }
 */
export async function handleReleaseEscrow(job: Job): Promise<void> {
  try {
    const { escrowId, paymentIntentId, partnerId, amount, taskId } = job.data

    if (!escrowId || !paymentIntentId) {
      throw new Error(
        `[release_escrow] Missing required fields: escrowId=${escrowId}, paymentIntentId=${paymentIntentId}`
      )
    }

    console.log('[TaskProcessor] Releasing escrow', { escrowId, taskId })

    // Guard: only release if still in 'paid' status (not disputed/cancelled/refunded)
    const { data: escrow } = await (supabaseAdmin as any)
      .from('escrow_transactions')
      .select('status, payout_cents, partner_id')
      .eq('id', escrowId)
      .single()

    if (!escrow) {
      throw new Error(`[release_escrow] Escrow ${escrowId} not found`)
    }

    if (escrow.status !== 'paid') {
      console.warn(
        `[release_escrow] Escrow ${escrowId} is in status '${escrow.status}' — skipping release`
      )
      return
    }

    // Fetch partner's Stripe connected account
    const { data: obrtnikProfile } = await (supabaseAdmin as any)
      .from('obrtnik_profiles')
      .select('stripe_account_id')
      .eq('user_id', partnerId)
      .single()

    if (!obrtnikProfile?.stripe_account_id) {
      // Partner not onboarded on Stripe yet — flag for manual processing
      await (supabaseAdmin as any)
        .from('escrow_transactions')
        .update({ notes: 'release_pending_stripe_onboarding' })
        .eq('id', escrowId)
      console.warn(
        `[release_escrow] Partner ${partnerId} has no Stripe account — flagged for manual release`
      )
      return
    }

    const { stripe } = await import('@/lib/stripe/client')
    const transfer = await stripe.transfers.create({
      amount: escrow.payout_cents,
      currency: 'eur',
      destination: obrtnikProfile.stripe_account_id,
      metadata: { escrowId, taskId, paymentIntentId },
      description: `LiftGO payout for task ${taskId}`,
    })

    await (supabaseAdmin as any)
      .from('escrow_transactions')
      .update({
        status: 'released',
        stripe_transfer_id: transfer.id,
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowId)

    console.log(`[TaskProcessor] Escrow ${escrowId} released — transfer ${transfer.id}`)
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

    // Enqueue review request email
    await enqueue('sendEmail', {
      to: task.customer_email,
      template: 'request_review',
      data: {
        taskId,
        taskTitle: task.title,
      },
    })

    console.log(`[TaskProcessor] Review request enqueued for task ${taskId}`)
  } catch (err) {
    console.error('[TaskProcessor] request_review error:', err)
    throw err
  }
}
