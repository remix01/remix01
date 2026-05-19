const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const read = (file) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('Security endpoint hardening contract', () => {
  it('customer cannot mutate another user offer/request via explicit ownership checks', () => {
    const ponudbeRoute = read('app/api/ponudbe/route.ts')
    expect(ponudbeRoute).toMatch(/if \(obrtnik_id !== user\.id\)/)
    expect(ponudbeRoute).toMatch(/SECURITY_MESSAGES\.forbidden/)
  })

  it('provider cannot withdraw another provider offer', () => {
    const service = read('lib/partner/offers/service.ts')
    expect(service).toMatch(/currentOffer\.obrtnik_id !== userId/)
    expect(service).toMatch(/PartnerOfferServiceError\('FORBIDDEN'/)
  })

  it('unauthenticated mutations are rejected', () => {
    const partnerOffers = read('app/api/partner/offers/route.ts')
    const partnerOfferById = read('app/api/partner/offers/[id]/route.ts')
    expect(partnerOffers).toMatch(/fail\('UNAUTHORIZED'/)
    expect(partnerOfferById).toMatch(/fail\('UNAUTHORIZED'/)
  })

  it('rate limit protection is active on inquiry and offers endpoints', () => {
    const inquiryRoute = read('app/api/povprasevanje/route.ts')
    const ponudbeRoute = read('app/api/ponudbe/route.ts')
    expect(inquiryRoute).toMatch(/withRateLimit\(inquiryLimiter, postHandler\)/)
    expect(ponudbeRoute).toMatch(/SECURITY_MESSAGES\.tooManyRequests/)
  })
})
