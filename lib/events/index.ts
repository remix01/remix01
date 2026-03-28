/**
 * Event System — Central export and initialization
 * 
 * Call initEventSubscribers() once during app startup.
 */

import { registerAnalyticsSubscriber } from './subscribers/analyticsSubscriber'
import { registerNotificationSubscriber } from './subscribers/notificationSubscriber'
import { registerAIInsightSubscriber } from './subscribers/aiInsightSubscriber'
import { registerEscrowSubscriber } from './subscribers/escrowSubscriber'
import { registerCommissionSubscriber } from './subscribers/commissionSubscriber'

export { eventBus } from './eventBus'
export * from './eventTypes'
export { OrderFulfillmentSaga } from './sagas/orderFulfillmentSaga'
export { PaymentSaga } from './sagas/paymentSaga'

let subscribersInitialized = false

/**
 * Initialize all event subscribers — idempotent, safe to call multiple times.
 *
 * Must be called explicitly in every serverless context that processes events
 * (e.g. layout.tsx for web requests, event-processor cron for outbox processing).
 * Each serverless invocation has its own module scope, so this flag resets per
 * cold start, but calling it once per invocation is enough.
 */
export function initEventSubscribers() {
  if (subscribersInitialized) return
  subscribersInitialized = true

  registerAnalyticsSubscriber()
  registerNotificationSubscriber()
  registerAIInsightSubscriber()
  registerEscrowSubscriber()
  registerCommissionSubscriber()
}
