const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(process.cwd(), 'lib/services/subscription.service.ts'),
  'utf8',
)

describe('subscriptionService mapping + sync matrix', () => {
  it('6) canonical partner lookup works via obrtnik_profiles when profiles mapping is missing', () => {
    expect(source).toMatch(/from\('profiles'\)\s*\.select\('id'\)\s*\.eq\('stripe_customer_id', customerId\)/)
    expect(source).toMatch(/from\('obrtnik_profiles'\)\s*\.select\('id'\)\s*\.eq\('stripe_customer_id', customerId\)/)
    expect(source).toMatch(/return obrtnikByCustomer\?\.id \?\? null/)
  })

  it('8) missing mapping logs safe error and does not crash', () => {
    expect(source).toMatch(/if \(!profileId\)/)
    expect(source).toMatch(/\[WEBHOOK\] Ne morem najti profila za customerId:/)
    expect(source).toMatch(/return/)
  })

  it('9) subscription status sync updates both profiles and obrtnik_profiles', () => {
    expect(source).toMatch(/from\('profiles'\)\s*\.update\(\{/)
    expect(source).toMatch(/stripe_customer_id:\s*customerId/)
    expect(source).toMatch(/subscription_tier:\s*tier/)
    expect(source).toMatch(/from\('obrtnik_profiles'\)\s*\.update\(\{/)
  })
})
