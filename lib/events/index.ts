/**
 * Event System – Central export and initialization
 * 
 * IMPROVED VERSION (2026-03-31):
 * - Idempotent initialization (safe to call multiple times)
 * - Works in both client and serverless contexts
 * - Proper error handling per subscriber
 * - Singleton pattern prevents duplicate registration
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

// Track initialization state to prevent duplicate registration
let subscribersInitialized = false

function shouldLogEventInitInfo() {
  return process.env.NODE_ENV !== 'production'
}

/**
 * Initialize all event subscribers
 * 
 * SAFE TO CALL MULTIPLE TIMES:
 * - In app/layout.tsx (client-side context)
 * - In /api/cron/event-processor (serverless context)
 * - In tests
 * 
 * Uses singleton pattern to ensure subscribers are only registered once
 * per execution context.
 */
export function initEventSubscribers() {
  if (subscribersInitialized) {
    if (shouldLogEventInitInfo()) console.log('[Events] Subscribers already initialized, skipping')
    return
  }

  if (shouldLogEventInitInfo()) console.log('[Events] Initializing event subscribers...')
  
  try {
    registerAnalyticsSubscriber()
    if (shouldLogEventInitInfo()) console.log('[Events] ✓ Analytics subscriber registered')
  } catch (err) {
    console.error('[Events] ✗ Failed to register analytics subscriber:', err)
  }

  try {
    registerNotificationSubscriber()
    if (shouldLogEventInitInfo()) console.log('[Events] ✓ Notification subscriber registered')
  } catch (err) {
    console.error('[Events] ✗ Failed to register notification subscriber:', err)
  }

  try {
    registerAIInsightSubscriber()
    if (shouldLogEventInitInfo()) console.log('[Events] ✓ AI Insight subscriber registered')
  } catch (err) {
    console.error('[Events] ✗ Failed to register AI insight subscriber:', err)
  }

  try {
    registerEscrowSubscriber()
    if (shouldLogEventInitInfo()) console.log('[Events] ✓ Escrow subscriber registered')
  } catch (err) {
    console.error('[Events] ✗ Failed to register escrow subscriber:', err)
  }

  try {
    registerCommissionSubscriber()
    if (shouldLogEventInitInfo()) console.log('[Events] ✓ Commission subscriber registered')
  } catch (err) {
    console.error('[Events] ✗ Failed to register commission subscriber:', err)
  }

  subscribersInitialized = true
  if (shouldLogEventInitInfo()) console.log('[Events] All subscribers initialized successfully')
}

/**
 * Reset initialization state (useful for testing)
 */
export function resetEventSubscribers() {
  subscribersInitialized = false
  if (shouldLogEventInitInfo()) console.log('[Events] Subscriber initialization state reset')
}
