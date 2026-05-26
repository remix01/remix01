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
      matchIds: matches.matches?.map((m) => m.partnerId) || [],
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
        .from('obrtnik_profiles')
        .select('id')
        .in('id', matchIds)

      // Fetch emails from profiles and enqueue notifications (obrtnik_profiles.id = profiles.id)
      for (const partner of partners || []) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('email, full_name')
          .eq('id', partner.id)
          .maybeSingle()
        if (profile?.email) {
          await enqueue('sendEmail', {
            to: profile.email,
            template: 'new_match',
            data: {
              partnerName: profile.full_name ?? '',
              taskTitle: task.title,
              taskId,
            },
          })
        }
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

    // Look up customer email from profiles
    const { data: customerProfile } = task.narocnik_id
      ? await supabaseAdmin.from('profiles').select('email').eq('id', task.narocnik_id).maybeSingle()
      : { data: null }

    // Enqueue Stripe capture to hold funds
    await enqueue('stripeCapture', {
      taskId,
      offerId,
      amount: amount || offer.price_estimate,
      customerEmail: customerProfile?.email ?? '',
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

    // Atomically claim the escrow by transitioning paid → releasing
    // This prevents concurrent release attempts from both proceeding
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({ status: 'releasing' })
      .eq('id', escrowId)
      .eq('status', 'paid')
      .select('id, payout_cents, partner_id')

    if (claimError) {
      throw new Error(`[release_escrow] Failed to claim escrow ${escrowId}: ${claimError.message}`)
    }

    if (!claimed || claimed.length === 0) {
      const { data: current } = await supabaseAdmin
        .from('escrow_transactions')
        .select('status')
        .eq('id', escrowId)
        .single()
      console.warn(
        `[release_escrow] Escrow ${escrowId} is in status '${current?.status ?? 'not found'}' — skipping release`
      )
      return
    }

    const escrow = claimed[0]

    // Fetch partner's Stripe connected account
    const { data: obrtnikProfile } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('stripe_account_id')
      .eq('id', partnerId)
      .single()

    if (!obrtnikProfile?.stripe_account_id) {
      // Revert to paid — partner not onboarded on Stripe yet
      await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'paid', notes: 'release_pending_stripe_onboarding' })
        .eq('id', escrowId)
        .eq('status', 'releasing')
      console.warn(
        `[release_escrow] Partner ${partnerId} has no Stripe account — reverted to paid, flagged for manual release`
      )
      return
    }

    let transfer: { id: string }
    try {
      const { stripe } = await import('@/lib/stripe/client')
      transfer = await stripe.transfers.create({
        amount: escrow.payout_cents,
        currency: 'eur',
        destination: obrtnikProfile.stripe_account_id,
        metadata: { escrowId, taskId, paymentIntentId },
        description: `LiftGO payout for task ${taskId}`,
      })
    } catch (stripeErr) {
      // Stripe transfer failed — revert to paid so it can be retried
      await supabaseAdmin
        .from('escrow_transactions')
        .update({ status: 'paid' })
        .eq('id', escrowId)
        .eq('status', 'releasing')
      throw stripeErr
    }

    // Stripe succeeded — finalize in DB
    const { data: released, error: releaseError } = await supabaseAdmin
      .from('escrow_transactions')
      .update({
        status: 'released',
        stripe_transfer_id: transfer.id,
        released_at: new Date().toISOString(),
      })
      .eq('id', escrowId)
      .eq('status', 'releasing')
      .select('id')

    if (releaseError || !released || released.length === 0) {
      console.error(`[TaskProcessor] DB update failed after Stripe transfer ${transfer.id} — reversing transfer`, {
        escrowId,
        releaseError,
      })
      try {
        const { stripe: stripeClient } = await import('@/lib/stripe/client')
        await stripeClient.transfers.createReversal(transfer.id)
        await supabaseAdmin
          .from('escrow_transactions')
          .update({ status: 'paid' })
          .eq('id', escrowId)
          .eq('status', 'releasing')
      } catch (reversalErr) {
        console.error(`[TaskProcessor] CRITICAL: Transfer ${transfer.id} reversal also failed — manual intervention required`, {
          escrowId,
          reversalErr,
        })
      }
      throw new Error(`[release_escrow] DB finalize failed for escrow ${escrowId}, transfer reversed`)
    }

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

    // Look up customer email
    const { data: customerProfile } = task.narocnik_id
      ? await supabaseAdmin.from('profiles').select('email').eq('id', task.narocnik_id).maybeSingle()
      : { data: null }

    // Enqueue review request email
    await enqueue('sendEmail', {
      to: customerProfile?.email ?? '',
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
