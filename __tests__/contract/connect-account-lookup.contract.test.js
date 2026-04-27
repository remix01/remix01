const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const source = fs.readFileSync(
  path.join(process.cwd(), 'lib/stripe/handlers/shared.ts'),
  'utf8',
)

describe('connect account lookup matrix', () => {
  it('6) canonical partner lookup prefers obrtnik_profiles', () => {
    expect(source).toMatch(/Canonical lookup: obrtnik_profiles has stripe_account_id/)
    expect(source).toMatch(/from\('obrtnik_profiles'\)/)
    expect(source).toMatch(/if \(canonicalPartner\)/)
    expect(source).toMatch(/from\('obrtnik_profiles'\)\s*\.update\(\{ stripe_account_id: connectedAccountId \}\)/)
  })

  it('7) legacy fallback lookup works via partners when canonical mapping is missing', () => {
    expect(source).toMatch(/Legacy fallback: partners table/)
    expect(source).toMatch(/from\('partners'\)/)
    expect(source).toMatch(/PARTNER_ID_MAPPING_FALLBACK/)
    expect(source).toMatch(/else if \(legacyPartnerId\)/)
    expect(source).toMatch(/from\('partners'\)\s*\.update\(\{/)
  })
})
