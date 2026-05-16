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

        // Extract payment intent ID from clientSecret (format: pi_xxx_secret_yyy)
        const paymentIntentId = ctx.clientSecret.split('_secret_')[0]
        console.log(`[PaymentSaga] Capturing payment intent ${paymentIntentId} for task ${ctx.taskId}`)

        const { chargeId } = await paymentService.confirmCharge(paymentIntentId)
        return { ...ctx, chargeId }
      },
      compensate: async (ctx) => {
        if (ctx.chargeId) {
          console.log(`[PaymentSaga] Refunding charge ${ctx.chargeId}`)
          await paymentService.refundCharge(ctx.chargeId)
        }
      },
    },

    {
      name: 'hold_escrow',
      execute: async (ctx) => {
        if (!ctx.chargeId) {
          throw new Error('Missing chargeId to create escrow')
        }

        console.log(`[PaymentSaga] Holding €${ctx.agreedPrice} in escrow for task ${ctx.taskId}`)

        const { escrowId } = await paymentService.holdEscrow(
          ctx.taskId,
          ctx.chargeId!,
          ctx.agreedPrice,
          ctx.partnerId,
          ctx.customerEmail ?? '',
        )
        return { ...ctx, escrowId }
      },
      compensate: async (ctx) => {
        if (ctx.escrowId) {
          console.log(`[PaymentSaga] Releasing escrow ${ctx.escrowId}`)
          await paymentService.releaseEscrow(ctx.escrowId)
        }
      },
    },

    {
      name: 'schedule_transfer',
      execute: async (ctx) => {
        if (!ctx.escrowId || !ctx.partnerId) {
          throw new Error('Missing escrowId or partnerId for transfer')
        }

        console.log(
          `[PaymentSaga] Scheduling transfer of €${ctx.agreedPrice} to partner ${ctx.partnerId} (24h dispute window)`
        )

        const { transferId } = await paymentService.scheduleTransfer(
          ctx.escrowId!,
          ctx.chargeId!,
          ctx.partnerId,
          ctx.agreedPrice,
          ctx.taskId,
        )
        return { ...ctx, transferId }
      },
      compensate: async (ctx) => {
        if (ctx.transferId) {
          console.log(`[PaymentSaga] Cancelling scheduled transfer ${ctx.transferId}`)
          await paymentService.cancelScheduledTransfer(ctx.transferId, ctx.escrowId)
        }
      },
    },
  ]
}
