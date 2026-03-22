/**
 * Task Orchestrator Usage Examples
 * 
 * This file demonstrates common patterns for using the Task Orchestrator
 * and Job Queue system in your application.
 */

import { taskOrchestrator } from '@/lib/services'
import { createClient } from '@/lib/supabase/server'

// ──────────────────────────────────────────────────────────────────
// Example 1: Create a Service Request Task
// ──────────────────────────────────────────────────────────────────

export async function createServiceRequestTask(input: {
  customerId: string
  requestId: string
  title: string
  category: string
  location: { lat: number; lng: number }
  budget: number
  deadline?: Date
  description?: string
}) {
  try {
    // Create task - this automatically enqueues matching
    const task = await taskOrchestrator.createTask({
      request_id: input.requestId,
      customer_id: input.customerId,
      title: input.title,
      category: input.category,
      location: input.location,
      budget: input.budget,
      deadline: input.deadline,
      description: input.description,
      sla_hours: 48, // Guarantee completion within 48 hours
      metadata: {
        source: 'web_app',
        createdAt: new Date().toISOString(),
      },
    })

    console.log(`[Task ${task.id}] Created with status=${task.status}`)
    // → match_request job automatically enqueued by createTask()

    return task
  } catch (error) {
    console.error('Failed to create task:', error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────
// Example 2: Accept an Offer (Multi-step)
// ──────────────────────────────────────────────────────────────────

export async function acceptOfferAndInitiatePayment(
  taskId: string,
  offerId: string,
  customerId: string,
  offerAmount: number,
  customerEmail: string
) {
  try {
    // Step 1: Accept the offer
    const task = await taskOrchestrator.acceptOffer(
      taskId,
      offerId,
      customerId
    )

    console.log(`[Task ${taskId}] Offer accepted, status=${task.status}`)
    // → create_escrow job automatically enqueued by acceptOffer()

    // Step 2: Wait a bit for escrow to be created (in production, use polling)
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Step 3: Check escrow status
    const updatedTask = await taskOrchestrator.getTask(taskId, customerId)
    console.log(`[Task ${taskId}] Updated status=${updatedTask.status}`)

    // Step 4: If in payment_pending, show payment UI to customer
    if (updatedTask.status === 'payment_pending') {
      // Frontend would show Stripe payment form here
      console.log(`[Task ${taskId}] Ready for customer payment`)
    }

    return updatedTask
  } catch (error) {
    console.error(`Failed to accept offer for task ${taskId}:`, error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────
// Example 3: Confirm Payment (After Stripe webhook)
// ──────────────────────────────────────────────────────────────────

export async function confirmPaymentAfterStripe(
  taskId: string,
  customerId: string,
  paymentIntentId: string
) {
  try {
    // Update task status to active after payment verified
    const task = await taskOrchestrator.confirmPayment(
      taskId,
      customerId,
      paymentIntentId
    )

    console.log(`[Task ${taskId}] Payment confirmed, status=${task.status}`)
    // → activate_guarantee job automatically enqueued

    // Task is now ready for craftworker to start
    return task
  } catch (error) {
    console.error(`Failed to confirm payment for task ${taskId}:`, error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────
// Example 4: Craftworker Workflow
// ──────────────────────────────────────────────────────────────────

export async function startWorkOnTask(
  taskId: string,
  craftworkerId: string,
  startNotes?: string
) {
  try {
    const task = await taskOrchestrator.startTask(taskId, craftworkerId)

    console.log(`[Task ${taskId}] Work started by craftworker, status=${task.status}`)
    // → task_started + activate_guarantee jobs enqueued

    // Optional: store start notes in metadata
    if (startNotes) {
      await taskOrchestrator.updateTask(taskId, {
        metadata: {
          ...task.metadata,
          startNotes,
          startedBy: craftworkerId,
        },
      })
    }

    return task
  } catch (error) {
    console.error(`Failed to start task ${taskId}:`, error)
    throw error
  }
}

export async function completeTaskWork(
  taskId: string,
  craftworkerId: string,
  completionNotes?: string
) {
  try {
    // Verify craftworker owns this task
    const task = await taskOrchestrator.getTask(taskId, craftworkerId)
    if (task.craftworker_id !== craftworkerId) {
      throw new Error('Unauthorized: not assigned to this task')
    }

    // Mark task as completed
    const completedTask = await taskOrchestrator.completeTask(
      taskId,
      craftworkerId
    )

    console.log(`[Task ${taskId}] Work completed, status=${completedTask.status}`)
    // → request_review job automatically enqueued

    // Store completion details
    if (completionNotes) {
      await taskOrchestrator.updateTask(taskId, {
        metadata: {
          ...task.metadata,
          completionNotes,
          completedAt: new Date().toISOString(),
        },
      })
    }

    return completedTask
  } catch (error) {
    console.error(`Failed to complete task ${taskId}:`, error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────
// Example 5: Query Task Status (Real-time Updates)
// ──────────────────────────────────────────────────────────────────

export async function getTaskWithDetails(taskId: string, userId: string) {
  try {
    const task = await taskOrchestrator.getTask(taskId, userId)

    return {
      id: task.id,
      status: task.status,
      title: task.title,
      budget: task.budget,
      offer: {
        amount: task.offer_amount,
        craftworkerId: task.craftworker_id,
      },
      timeline: {
        createdAt: task.created_at,
        startedAt: task.started_at,
        completedAt: task.completed_at,
        deadline: task.deadline,
      },
      guaranteeActive: task.guarantee_activated,
      matches: task.matches,
      metadata: task.metadata,
    }
  } catch (error) {
    console.error(`Failed to fetch task ${taskId}:`, error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────
// Example 6: List User's Tasks with Filters
// ──────────────────────────────────────────────────────────────────

export async function listUserTasks(
  userId: string,
  filters?: {
    status?: string
    role?: 'customer' | 'craftworker'
    limit?: number
    offset?: number
  }
) {
  try {
    const tasks = await taskOrchestrator.listTasks(userId, {
      status: filters?.status,
      role: filters?.role,
      limit: filters?.limit || 20,
      offset: filters?.offset || 0,
    })

    return {
      tasks,
      total: tasks.length,
      filters,
    }
  } catch (error) {
    console.error(`Failed to list tasks for user ${userId}:`, error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────
// Example 7: Monitor Job Queue Status
// ──────────────────────────────────────────────────────────────────

export async function checkTaskJobStatus(taskId: string) {
  try {
    const supabase = await createClient()

    // Get all jobs for this task
    const { data: jobs, error } = await supabase
      .from('task_queue_jobs')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Group by status
    const jobsByStatus = {
      pending: jobs?.filter(j => j.status === 'pending') || [],
      processing: jobs?.filter(j => j.status === 'processing') || [],
      completed: jobs?.filter(j => j.status === 'completed') || [],
      failed: jobs?.filter(j => j.status === 'failed') || [],
    }

    console.log(`[Task ${taskId}] Job summary:`, {
      total: jobs?.length || 0,
      byStatus: {
        pending: jobsByStatus.pending.length,
        processing: jobsByStatus.processing.length,
        completed: jobsByStatus.completed.length,
        failed: jobsByStatus.failed.length,
      },
    })

    // Show errors if any
    if (jobsByStatus.failed.length > 0) {
      console.error(
        `[Task ${taskId}] Failed jobs:`,
        jobsByStatus.failed.map(j => ({
          type: j.job_type,
          error: j.error_details,
        }))
      )
    }

    return jobsByStatus
  } catch (error) {
    console.error(`Failed to check job status for task ${taskId}:`, error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────
// Example 8: Handle Task Expiration
// ──────────────────────────────────────────────────────────────────

export async function expireTaskIfNeeded(taskId: string) {
  try {
    const supabase = await createClient()

    const { data: task, error } = await supabase
      .from('service_requests')
      .select('*')
      .eq('id', taskId)
      .single()

    if (error) throw error

    const now = new Date()

    // Check if matches have expired (24 hours without response)
    if (task.status === 'matches_found') {
      const createdAt = new Date(task.created_at)
      const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60)

      if (hoursElapsed > 24) {
        await taskOrchestrator.expireTask(taskId)
        console.log(`[Task ${taskId}] Expired: no matches response after 24h`)
      }
    }

    // Check if offer has expired (7 days without acceptance)
    if (task.status === 'offer_accepted') {
      const offeredAt = new Date(task.updated_at)
      const daysElapsed = (now.getTime() - offeredAt.getTime()) / (1000 * 60 * 60 * 24)

      if (daysElapsed > 7) {
        await taskOrchestrator.expireTask(taskId)
        console.log(`[Task ${taskId}] Expired: offer not accepted after 7 days`)
      }
    }

    return task
  } catch (error) {
    console.error(`Failed to check expiration for task ${taskId}:`, error)
    throw error
  }
}

// ──────────────────────────────────────────────────────────────────
// Example 9: React Hook for Task Polling
// ──────────────────────────────────────────────────────────────────

// import { useState, useEffect } from 'react'
// import useSWR from 'swr'
//
// export function useTask(taskId: string, userId: string) {
//   const fetcher = async () => {
//     const res = await fetch(`/api/tasks`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         action: 'get_task',
//         taskId,
//       }),
//     })
//     return res.json()
//   }
//
//   const { data, error, isLoading, mutate } = useSWR(
//     taskId ? `task-${taskId}` : null,
//     fetcher,
//     {
//       revalidateOnFocus: false,
//       dedupingInterval: 2000,
//     }
//   )
//
//   return {
//     task: data?.data,
//     error,
//     isLoading,
//     mutate,
//   }
// }

export default {
  createServiceRequestTask,
  acceptOfferAndInitiatePayment,
  confirmPaymentAfterStripe,
  startWorkOnTask,
  completeTaskWork,
  getTaskWithDetails,
  listUserTasks,
  checkTaskJobStatus,
  expireTaskIfNeeded,
}
