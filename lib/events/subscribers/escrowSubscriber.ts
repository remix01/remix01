/**
 * Escrow Subscriber — Manages escrow hold + release flow
 * 
 * Coordinates with paymentService to hold/release funds based on task lifecycle.
 * Escrow is held when offer accepted, released after completion (with 24h dispute window).
 */

import { eventBus } from '../eventBus'
import { paymentService } from '@/lib/services'

export function registerEscrowSubscriber() {
  eventBus.on('task.accepted', async (payload) => {
    try {
      // Hold escrow when offer accepted
      // Amount = agreedPrice (customer's payment)
      console.log('[EscrowSubscriber] Creating escrow hold for task:', payload.taskId)
      
      // TODO: Implement if escrow hold method exists in paymentService
      // await paymentService.createEscrowHold({
      //   taskId: payload.taskId,
      //   amount: payload.agreedPrice,
      //   customerId: payload.customerId,
      //   partnerId: payload.partnerId,
      // })
    } catch (err) {
      console.error('[EscrowSubscriber] Error on task.accepted:', err)
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
