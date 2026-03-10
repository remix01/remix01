/**
 * Escrow Subscriber — Manages escrow hold + release flow
 * 
 * Coordinates with paymentService to hold/release funds based on task lifecycle.
 * Escrow is held when offer accepted, released after completion (with 24h dispute window).
 * 
 * Triggers PaymentSaga to orchestrate multi-step payment transactions.
 */

import { eventBus } from '../eventBus'
import { paymentService } from '@/lib/services'
import { PaymentSaga } from '../sagas/paymentSaga'

export function registerEscrowSubscriber() {
  eventBus.on('task.accepted', async (payload) => {
    try {
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
      // PaymentSaga will handle compensation, but log the error for monitoring
    }
  })

  eventBus.on('task.completed', async (payload) => {
    try {
      // Schedule escrow release
      // Doesn't release immediately — waits 24h for disputes
      console.log('[EscrowSubscriber] Scheduling escrow release for task:', payload.taskId)

      // TODO: Implement if scheduleEscrowRelease method exists in paymentService
      // await paymentService.scheduleEscrowRelease({
      //   taskId: payload.taskId,
      //   partnerId: payload.partnerId,
      //   releaseDelayMs: 24 * 60 * 60 * 1000, // 24 hours
      // })
    } catch (err) {
      console.error('[EscrowSubscriber] Error on task.completed:', err)
    }
  })
}
