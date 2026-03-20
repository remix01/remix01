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

/**
 * Initialize all event subscribers
 * Call once during app startup (e.g., in layout.tsx or middleware)
 */
export function initEventSubscribers() {
  registerAnalyticsSubscriber()
  registerNotificationSubscriber()
  registerAIInsightSubscriber()
  registerEscrowSubscriber()
  registerCommissionSubscriber()
}
