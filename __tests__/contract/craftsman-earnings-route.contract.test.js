const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

const ROUTE = 'app/api/craftsman/earnings/route.ts'
const SERVICE = 'lib/craftsman/earnings/service.ts'
const TYPES = 'lib/craftsman/earnings/types.ts'
const PAYMENTS_SECTION = 'components/partner/payments-section.tsx'

const routeSource = read(ROUTE)
const serviceSource = read(SERVICE)
const typesSource = read(TYPES)
const paymentsSource = read(PAYMENTS_SECTION)

describe('Craftsman earnings route/service contract', () => {
  it('success response delegates to service and returns canonical envelope', () => {
    expect(routeSource).toMatch(/earningsService\.getCraftsmanEarnings\(/)
    expect(routeSource).toMatch(/return ok\(data\)/)
  })

  it('unauthorized response remains explicit', () => {
    expect(routeSource).toMatch(/if \(authError \|\| !user\) \{\s*return fail\('UNAUTHORIZED', 'Unauthorized', 401\)/)
  })

  it('empty payouts state is preserved as [] in DTO response', () => {
    expect(serviceSource).toMatch(/const payoutList = \(payouts \?\? \[\]\)\.map\(toPayoutDto\)/)
    expect(serviceSource).toMatch(/recentPayouts: payoutList/)
  })

  it('response DTO shape is explicit and consumed by PaymentsSection without any', () => {
    expect(typesSource).toMatch(/export interface EarningsResponseDto/)
    expect(typesSource).toMatch(/export interface EarningsPayoutDto/)
    expect(paymentsSource).toMatch(/useState<EarningsResponseDto \| null>/)
    expect(paymentsSource).not.toMatch(/useState<any>/)
    expect(paymentsSource).not.toMatch(/\(payout: any\)/)
  })

  it('payment/commission calculations remain semantically unchanged', () => {
    expect(serviceSource).toMatch(/const totalEarnings = payoutList\.reduce\(\(sum, p\) => sum \+ p\.amount, 0\)/)
    expect(serviceSource).toMatch(/new Date\(now\.getFullYear\(\), now\.getMonth\(\), 1\)/)
    expect(serviceSource).toMatch(/\.eq\('status', 'sprejeta'\)/)
    expect(serviceSource).toMatch(/pendingPayouts = \(acceptedPonudbe \?\? \[\]\)/)
  })
})
