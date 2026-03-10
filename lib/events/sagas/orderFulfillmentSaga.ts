/**
 * Order Fulfillment Saga — 5-step transaction orchestrating the complete task flow
 * 
 * 1. trigger_matching — Start the matching pipeline
 * 2. confirm_match — Wait for partners to be matched
 * 3. hold_escrow — Create escrow hold for payment
 * 4. schedule_payment_release — Set up 24h delay for dispute window
 * 5. request_review — Emit completion event to request customer review
 * 
 * If any step fails, all previous steps are compensated in reverse.
 */

import { SagaBase, SagaStep } from './sagaBase'
import { taskOrchestrator } from '@/lib/services/taskOrchestrator'
import { paymentService } from '@/lib/services'
import { eventBus } from '@/lib/events'

export interface OrderContext {
  taskId: string
  customerId: string
  partnerId?: string
  offerId?: string
  agreedPrice?: number
  escrowId?: string
  matchIds?: string[]
}

export class OrderFulfillmentSaga extends SagaBase<OrderContext> {
  sagaType = 'order_fulfillment'

  steps: SagaStep<OrderContext>[] = [
    {
      name: 'trigger_matching',
      execute: async (ctx) => {
        // Start the matching pipeline via taskOrchestrator
        await taskOrchestrator.updateTaskStatus(ctx.taskId, 'matching')
        console.log(`[OrderFulfillmentSaga] Triggered matching for task ${ctx.taskId}`)
        return ctx
      },
      compensate: async (ctx) => {
        // If we started matching but saga failed later, cancel the task
        await taskOrchestrator.updateTaskStatus(ctx.taskId, 'cancelled')
        console.log(`[OrderFulfillmentSaga] Cancelled task ${ctx.taskId}`)
      },
    },

    {
      name: 'confirm_match',
      execute: async (ctx) => {
        // Wait for matches to be found (handled by liquidity engine)
        // In practice, this would be triggered by task.matched event
        // For now, just log that we're waiting
        console.log(`[OrderFulfillmentSaga] Confirmed match for task ${ctx.taskId}`)
        return ctx
      },
      compensate: async (ctx) => {
        // Matching is read-only, no compensation needed
        console.log(`[OrderFulfillmentSaga] No compensation for match step`)
      },
    },

    {
      name: 'hold_escrow',
      execute: async (ctx) => {
        if (!ctx.agreedPrice || !ctx.customerId) {
          throw new Error('Missing agreedPrice or customerId for escrow hold')
        }

        // Hold escrow: customer's payment is reserved but not charged
        console.log(
          `[OrderFulfillmentSaga] Holding escrow €${ctx.agreedPrice} for task ${ctx.taskId}`
        )

        // TODO: Call paymentService method when implemented
        // const escrow = await paymentService.createEscrowHold({
        //   taskId: ctx.taskId,
        //   amount: ctx.agreedPrice,
        //   customerId: ctx.customerId,
        //   partnerId: ctx.partnerId,
        // })
        // return { ...ctx, escrowId: escrow.id }

        return ctx
      },
      compensate: async (ctx) => {
        if (ctx.escrowId) {
          // Release the escrow hold (money back to customer)
          console.log(`[OrderFulfillmentSaga] Voiding escrow ${ctx.escrowId}`)
          // TODO: await paymentService.voidEscrow(ctx.escrowId)
        }
      },
    },

    {
      name: 'schedule_payment_release',
      execute: async (ctx) => {
        if (ctx.partnerId) {
          // Schedule the escrow release 24 hours after completion
          console.log(
            `[OrderFulfillmentSaga] Scheduling escrow release for partner ${ctx.partnerId} in 24h`
          )
          // TODO: await paymentService.scheduleEscrowRelease(ctx.taskId, ctx.partnerId)
        }
        return ctx
      },
      compensate: async (ctx) => {
        // Cancel the scheduled release if saga fails
        console.log(`[OrderFulfillmentSaga] Cancelling scheduled release for task ${ctx.taskId}`)
        // TODO: await paymentService.cancelScheduledRelease(ctx.taskId)
      },
    },

    {
      name: 'request_review',
      execute: async (ctx) => {
        // Emit task.completed event to trigger review requests
        console.log(`[OrderFulfillmentSaga] Requesting review for task ${ctx.taskId}`)
        await eventBus.emit('task.completed', {
          taskId: ctx.taskId,
          customerId: ctx.customerId,
          partnerId: ctx.partnerId ?? '',
          completedAt: new Date().toISOString(),
          finalPrice: ctx.agreedPrice ?? 0,
        })
        return ctx
      },
      compensate: async (ctx) => {
        // Review request is not critical — no compensation needed
        console.log(`[OrderFulfillmentSaga] Skipping review cleanup on failure`)
      },
    },
  ]
}
