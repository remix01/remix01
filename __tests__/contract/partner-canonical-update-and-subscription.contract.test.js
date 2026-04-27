const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const PROFILE_ROUTE = fs.readFileSync(
  path.join(process.cwd(), 'app/api/partner/profil/route.ts'),
  'utf8',
)
const PARTNER_SERVICE = fs.readFileSync(
  path.join(process.cwd(), 'lib/partner/service.ts'),
  'utf8',
)
const SUBSCRIPTION_SERVICE = fs.readFileSync(
  path.join(process.cwd(), 'lib/services/subscription.service.ts'),
  'utf8',
)

describe('Canonical partner update + subscription mapping contract', () => {
  it('partner profile PATCH still delegates updates to canonicalPartnerService', () => {
    expect(PROFILE_ROUTE).toMatch(/canonicalPartnerService\.updateProfile/)
    expect(PROFILE_ROUTE).toMatch(/single-write canonical/i)
  })

  it('canonical partner service updates obrtnik_profiles and never partners table', () => {
    expect(PARTNER_SERVICE).toMatch(/from\('obrtnik_profiles'\)/)
    expect(PARTNER_SERVICE).not.toMatch(/from\('partners'\)/)
  })

  it('subscription mapping still updates both profiles and obrtnik_profiles', () => {
    expect(SUBSCRIPTION_SERVICE).toMatch(/from\('profiles'\)/)
    expect(SUBSCRIPTION_SERVICE).toMatch(/from\('obrtnik_profiles'\)/)
    expect(SUBSCRIPTION_SERVICE).toMatch(/stripe_customer_id/)
    expect(SUBSCRIPTION_SERVICE).toMatch(/subscription_tier/)
  })
})

