const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const FILES = {
  partnerResolver: 'lib/partner/resolver.ts',
  obrtnikPovprasevanjaRoute: 'app/api/obrtnik/povprasevanja/route.ts',
}

const source = Object.fromEntries(
  Object.entries(FILES).map(([key, file]) => [key, fs.readFileSync(path.join(process.cwd(), file), 'utf8')])
)

describe('Identity fallback telemetry contract', () => {
  it('partner canonical resolver emits structured warning code on legacy user_id fallback', () => {
    expect(source.partnerResolver).toMatch(/PARTNER_ID_MAPPING_FALLBACK/)
    expect(source.partnerResolver).toMatch(/path:\s*'obrtnik_profiles\.user_id'/)
    expect(source.partnerResolver).toMatch(/console\.warn\(/)
  })

  it('/api/obrtnik/povprasevanja emits warning code for identity fallback and query-param compatibility path', () => {
    expect(source.obrtnikPovprasevanjaRoute).toMatch(/OBRTNIK_IDENTITY_LEGACY_FALLBACK/)
    expect(source.obrtnikPovprasevanjaRoute).toMatch(/OBRTNIK_QUERY_PARAM_COMPAT/)
    expect(source.obrtnikPovprasevanjaRoute).toMatch(/console\.warn\(/)
  })

  it('fallback paths remain marked as transitional with TODO migration hints', () => {
    expect(source.partnerResolver).toMatch(/legacy fallback/)
    expect(source.obrtnikPovprasevanjaRoute).toMatch(/TODO\(migration\)/)
  })
})
