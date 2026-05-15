/**
 * Payment Saga — 4-step transaction orchestrating payment processing
 * 
 * Triggered on task.accepted event. Coordinates:
 * 1. create_payment_intent — Create Stripe payment intent
 * 2. confirm_charge — Process payment via Stripe
 * 3. hold_escrow — Move funds to escrow (temporary hold)
 * 4. execute_transfer — Transfer to partner (after dispute window closes)
 * 
 * Compensations handle refunds and void operations.
 */

import { SagaBase, SagaStep } from './sagaBase'
import { paymentService } from '@/lib/services'

export interface PaymentContext {
  taskId: string
  customerId: string
  partnerId: string
  offerId: string
  agreedPrice: number
  customerEmail?: string
  clientSecret?: string
  chargeId?: string
  escrowId?: string
  transferId?: string
}

export class PaymentSaga extends SagaBase<PaymentContext> {
  sagaType = 'payment_saga'

  steps: SagaStep<PaymentContext>[] = [
    {
      name: 'create_payment_intent',
      execute: async (ctx) => {
        // Create Stripe payment intent
        console.log('[PaymentSaga] Creating payment intent', {
          saga: 'payment_saga',
          step: 'create_payment_intent',
          taskId: ctx.taskId,
          offerId: ctx.offerId,
          agreedPrice: ctx.agreedPrice,
        })

        if (!ctx.customerEmail) {
          throw new Error(
            '[PaymentSaga] Missing customerEmail for create_payment_intent. ' +
            'Fail-closed: payment intent creation requires explicit payer email.'
          )
        }

        const result = await paymentService.createPaymentIntent(
          ctx.customerId,
          ctx.offerId,
          ctx.customerEmail
        )
        if (!result.clientSecret) {
          throw new Error('[PaymentSaga] Stripe did not return clientSecret for payment intent')
        }
        return { ...ctx, clientSecret: result.clientSecret }
      },
      compensate: async (ctx) => {
        // Payment intent can expire naturally, no action needed
        console.log(`[PaymentSaga] Payment intent expired (no compensation needed)`)
      },
    },

    {
      name: 'confirm_charge',
      execute: async (ctx) => {
        if (!ctx.clientSecret) {
          throw new Error('Missing clientSecret for payment confirmation')
        }

        // Confirm the payment charge via Stripe
        console.log(`[PaymentSaga] Confirming payment charge for task ${ctx.taskId}`)

        throw new Error(
          '[PaymentSaga] BLOCKER: confirm_charge step is not implemented in paymentService. ' +
          'Fail-closed to prevent silent payment state divergence.'
        )
      },
      compensate: async (ctx) => {
        if (ctx.chargeId) {
          // Refund the charge
          console.log(`[PaymentSaga] Refunding charge ${ctx.chargeId}`)
          console.warn('[PaymentSaga] TODO BLOCKER: refundCharge missing in paymentService', {
            saga: 'payment_saga',
            step: 'confirm_charge.compensate',
            taskId: ctx.taskId,
            chargeId: ctx.chargeId,
          })
        }
      },
    },

    {
      name: 'hold_escrow',
      execute: async (ctx) => {
        if (!ctx.chargeId) {
          throw new Error('Missing chargeId to create escrow')
        }

        // Move funds from charge to escrow (temporary hold, not transferred yet)
        console.log(`[PaymentSaga] Holding €${ctx.agreedPrice} in escrow for task ${ctx.taskId}`)

        throw new Error(
          '[PaymentSaga] BLOCKER: hold_escrow step is not implemented in paymentService. ' +
          'Fail-closed to avoid accepting charge without escrow hold.'
        )
      },
      compensate: async (ctx) => {
        if (ctx.escrowId) {
          // Release escrow hold (money back to customer)
          console.log(`[PaymentSaga] Releasing escrow ${ctx.escrowId}`)
          console.warn('[PaymentSaga] TODO BLOCKER: releaseEscrow missing in paymentService', {
            saga: 'payment_saga',
            step: 'hold_escrow.compensate',
            taskId: ctx.taskId,
            escrowId: ctx.escrowId,
          })
        }
      },
    },

    {
      name: 'schedule_transfer',
      execute: async (ctx) => {
        if (!ctx.escrowId || !ctx.partnerId) {
          throw new Error('Missing escrowId or partnerId for transfer')
        }

        // Schedule escrow release to partner after dispute window (24h)
        console.log(
          `[PaymentSaga] Scheduling transfer of €${ctx.agreedPrice} to partner ${ctx.partnerId}`
        )

        throw new Error(
          '[PaymentSaga] BLOCKER: schedule_transfer step is not implemented in paymentService. ' +
          'Fail-closed to avoid unscheduled payout release risk.'
        )
      },
      compensate: async (ctx) => {
        if (ctx.transferId) {
          // Cancel the scheduled transfer
          console.log(`[PaymentSaga] Cancelling scheduled transfer ${ctx.transferId}`)
          console.warn('[PaymentSaga] TODO BLOCKER: cancelScheduledTransfer missing in paymentService', {
            saga: 'payment_saga',
            step: 'schedule_transfer.compensate',
            taskId: ctx.taskId,
            transferId: ctx.transferId,
          })
        }
      },
    },
  ]
}
