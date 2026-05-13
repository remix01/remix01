/**
 * Escrow Subscriber — Manages escrow hold + release flow
 * 
 * Idempotency is CRITICAL here — duplicate escrow hold = double charge.
 * 
 * Pattern:
 * 1. Check idempotency — prevents duplicate payment holds
 * 2. Trigger PaymentSaga or escrow operation
 */

import { eventBus } from '../eventBus'
import { paymentService } from '@/lib/services'
import { idempotency } from '../idempotency'
import { PaymentSaga } from '../sagas/paymentSaga'

export function registerEscrowSubscriber() {
  eventBus.on('task.accepted', async (payload) => {
    try {
      // CRITICAL: prevent duplicate escrow holds
      const skip = await idempotency.checkAndMark('task.accepted', 'escrow', payload.taskId)
      if (skip) return

      console.log('[EscrowSubscriber] Task accepted, triggering PaymentSaga:', payload.taskId)

      // Trigger PaymentSaga to orchestrate payment flow
      const saga = new PaymentSaga()
      await saga.execute({
        taskId: payload.taskId,
        customerId: payload.customerId,
        partnerId: payload.partnerId,
        offerId: payload.offerId,
        agreedPrice: payload.agreedPrice,
      })

      console.log('[EscrowSubscriber] PaymentSaga completed for task:', payload.taskId)
    } catch (err) {
      console.error('[EscrowSubscriber] Error on task.accepted:', err)
    }
  })

  eventBus.on('task.completed', async (payload) => {
    try {
      const skip = await idempotency.checkAndMark('task.completed', 'escrow', payload.taskId)
      if (skip) return

      if (!payload.partnerId || !payload.finalPrice) {
        console.warn('[EscrowSubscriber] Missing partnerId or finalPrice on task.completed:', payload.taskId)
        return
      }

      console.log('[EscrowSubscriber] Releasing escrow for task:', payload.taskId)
      await paymentService.releasePayment(payload.taskId, payload.partnerId, payload.finalPrice)
      console.log('[EscrowSubscriber] Escrow released for task:', payload.taskId)
    } catch (err) {
      console.error('[EscrowSubscriber] Error on task.completed:', err)
    }
  })
}
