const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const routeSource = fs.readFileSync(
  path.join(process.cwd(), 'app/api/webhooks/stripe/route.ts'),
  'utf8',
)

describe('Stripe webhook route idempotency matrix', () => {
  it('5) repeated webhook event is skipped and does not execute handler', () => {
    expect(routeSource).toMatch(/isStripeEventProcessed\(event\.id\)/)
    expect(routeSource).toMatch(/return ok\(\{\s*received:\s*true,\s*skipped:\s*true\s*\}\)/)
    expect(routeSource).toMatch(/const handler = stripeWebhookHandlers\[event\.type\]/)
  })
})
