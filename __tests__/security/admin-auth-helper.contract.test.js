const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const file = 'lib/admin-auth.ts'
const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('Admin auth helper contract', () => {
  it('maps auth user to admin_users via canonical auth_user_id only', () => {
    expect(source).toMatch(/\.eq\('auth_user_id', user\.id\)/)
    expect(source).not.toMatch(/\.eq\('user_id', user\.id\)/)
  })

  it('uses explicit typed errors for unauthorized/forbidden states', () => {
    expect(source).toMatch(/class AdminAuthError/)
    expect(source).toMatch(/new AdminAuthError\('UNAUTHORIZED'\)/)
    expect(source).toMatch(/new AdminAuthError\('FORBIDDEN'\)/)
  })
})

