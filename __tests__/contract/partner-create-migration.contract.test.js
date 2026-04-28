const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const FILE = 'app/api/partner/create/route.ts'
const source = fs.readFileSync(path.join(process.cwd(), FILE), 'utf8')

describe('POST /api/partner/create canonical + compatibility contract', () => {
  it('uses canonical obrtnik_profiles as primary write path', () => {
    expect(source).toMatch(/from\("obrtnik_profiles"\)/)
    expect(source).toMatch(/\.upsert\(/)
    expect(source).toMatch(/canonical_source:\s*"obrtnik_profiles"/)
  })

  it('keeps legacy partners write path only as compatibility fallback', () => {
    expect(source).toMatch(/isSchemaCompatibilityError/)
    expect(source).toMatch(/LEGACY_PARTNER_WRITE_COMPAT/)
    expect(source).toMatch(/from\("partners"\)/)
    expect(source).toMatch(/TODO\(migration\): remove this legacy write/)
  })

  it('retains canonical response envelope and created status', () => {
    expect(source).toMatch(/\bok\(/)
    expect(source).toMatch(/201/)
    expect(source).toMatch(/\bfail\(/)
  })
})

