const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const ROUTES = [
  'app/api/admin/monetization/route.ts',
  'app/api/admin/monetization/upgrade-user/route.ts',
  'app/api/admin/monetization/reset-ai-usage/route.ts',
  'app/api/admin/monetization/flag-user/route.ts',
]

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

describe('Admin monetization auth hardening contract', () => {
  it('all P0 monetization endpoints use the unified admin helper', () => {
    for (const file of ROUTES) {
      const source = read(file)
      expect(source).toMatch(/from ['"]@\/lib\/admin-auth['"]/)
      expect(source).toMatch(/await requireAdmin\(\['super_admin'\]\)/)
    }
  })

  it('all endpoints map auth failures through toAdminAuthFailure()', () => {
    for (const file of ROUTES) {
      const source = read(file)
      expect(source).toMatch(/toAdminAuthFailure\(error\)/)
      expect(source).toMatch(/UNAUTHORIZED/)
      expect(source).toMatch(/FORBIDDEN/)
      expect(source).toMatch(/status:\s*authFailure\.status/)
    }
  })
})

describe('Admin monetization response envelope compatibility contract', () => {
  it('all endpoints include canonical success marker without dropping legacy success fields', () => {
    for (const file of ROUTES) {
      const source = read(file)
      expect(source).toMatch(/ok:\s*true/)
      if (file !== 'app/api/admin/monetization/route.ts') {
        expect(source).toMatch(/success:\s*true/)
      }
    }
  })

  it('all endpoints include canonical error shape and a legacy-compatible error string field', () => {
    for (const file of ROUTES) {
      const source = read(file)
      expect(source).toMatch(/ok:\s*false/)
      expect(source).toMatch(/error:\s*\{\s*code:\s*/)
      expect(source).toMatch(/legacy_error:\s*/)
    }
  })
})

