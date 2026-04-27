const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const FILE = 'app/api/obrtnik/povprasevanja/route.ts'
const source = fs.readFileSync(path.join(process.cwd(), FILE), 'utf8')

describe('GET /api/obrtnik/povprasevanja auth hardening contract', () => {
  it('rejects anonymous users by checking authenticated session user', () => {
    expect(source).toMatch(/createClient\(\)/)
    expect(source).toMatch(/supabase\.auth\.getUser\(\)/)
    expect(source).toMatch(/UNAUTHORIZED/)
    expect(source).toMatch(/errorResponse\(401,\s*'UNAUTHORIZED'/)
  })

  it('resolves craftsman identity from authenticated user and canonical mapping first', () => {
    expect(source).toMatch(/from\('obrtnik_profiles'\)/)
    expect(source).toMatch(/\.eq\('id', user\.id\)/)
  })

  it('keeps legacy mapping/query-param fallback only as guarded compatibility path', () => {
    expect(source).toMatch(/\.eq\('user_id', user\.id\)/)
    expect(source).toMatch(/OBRTNIK_IDENTITY_LEGACY_FALLBACK/)
    expect(source).toMatch(/OBRTNIK_QUERY_PARAM_COMPAT/)
    expect(source).toMatch(/TODO/)
  })

  it('forbids requesting another craftsman data via query param override', () => {
    expect(source).toMatch(/requestedObrtnikId && requestedObrtnikId !== resolvedObrtnikId/)
    expect(source).toMatch(/FORBIDDEN/)
    expect(source).toMatch(/errorResponse\(403,\s*'FORBIDDEN'/)
  })
})

describe('GET /api/obrtnik/povprasevanja response compatibility contract', () => {
  it('retains legacy success fields and adds canonical ok=true marker', () => {
    expect(source).toMatch(/ok:\s*true/)
    expect(source).toMatch(/success:\s*true/)
    expect(source).toMatch(/inquiries:/)
    expect(source).toMatch(/grouped,/)
    expect(source).toMatch(/total:/)
  })

  it('returns canonical error shape with legacy-compatible error string', () => {
    expect(source).toMatch(/ok:\s*false/)
    expect(source).toMatch(/error:\s*\{/)
    expect(source).toMatch(/legacy_error:\s*message/)
  })
})
