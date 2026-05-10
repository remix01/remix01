const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const checkoutSource = fs.readFileSync(
  path.join(process.cwd(), 'lib/stripe/handlers/checkoutCompleted.ts'),
  'utf8',
)
const subscriptionSource = fs.readFileSync(
  path.join(process.cwd(), 'lib/stripe/handlers/subscriptionUpdated.ts'),
  'utf8',
)

describe('Stripe subscription webhook handlers matrix', () => {
  it('1) checkout.session.completed -> resolves tier and syncs subscription', () => {
    expect(checkoutSource).toMatch(/session\.mode !== 'subscription'/)
    expect(checkoutSource).toMatch(/stripeProxy\.subscriptions\.retrieve/)
    expect(checkoutSource).toMatch(/tierFromPriceId/)
    expect(checkoutSource).toMatch(/updateSubscription\(userId,\s*customerId,\s*tier,\s*subscriptionId\)/)
  })

  it('2) customer.subscription.created -> passes metadata user_id and mapped tier', () => {
    expect(subscriptionSource).toMatch(/event\.type === 'customer\.subscription\.created'/)
    expect(subscriptionSource).toMatch(/subscription\.metadata\?\.user_id/)
    expect(subscriptionSource).toMatch(/tierFromPriceId/)
  })

  it('3) customer.subscription.updated -> syncs active tier with null userId path', () => {
    expect(subscriptionSource).toMatch(/event\.type === 'customer\.subscription\.created'\s*\?\s*subscription\.metadata\?\.user_id\s*\?\?\s*null\s*:\s*null/)
    expect(subscriptionSource).toMatch(/if \(subscription\.status !== 'active'\) return/)
  })

  it('4) customer.subscription.deleted -> downgrades to start', () => {
    expect(subscriptionSource).toMatch(/event\.type === 'customer\.subscription\.deleted'/)
    expect(subscriptionSource).toMatch(/updateSubscription\(null,\s*customerId,\s*'start',\s*subscription\.id\)/)
  })
})
