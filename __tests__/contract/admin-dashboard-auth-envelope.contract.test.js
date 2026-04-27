const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const FILES = {
  analytics: 'app/api/admin/analytics/route.ts',
  analyticsSummary: 'app/api/admin/analytics/summary/route.ts',
  payments: 'app/api/admin/payments/route.ts',
  disputes: 'app/api/admin/disputes/route.ts',
  me: 'app/api/admin/me/route.ts',
}

const src = Object.fromEntries(
  Object.entries(FILES).map(([key, file]) => [
    key,
    fs.readFileSync(path.join(process.cwd(), file), 'utf8'),
  ])
)

describe('Admin dashboard endpoints auth contract', () => {
  it('all scoped endpoints use the robust admin helper', () => {
    for (const source of Object.values(src)) {
      expect(source).toMatch(/from ['"]@\/lib\/admin-auth['"]/)
      expect(source).toMatch(/await requireAdmin\(/)
      expect(source).toMatch(/toAdminAuthFailure\(error\)/)
    }
  })

  it('auth failures support 401 (anon) and 403 (non-admin) branches', () => {
    for (const source of Object.values(src)) {
      expect(source).toMatch(/UNAUTHORIZED/)
      expect(source).toMatch(/FORBIDDEN/)
      expect(source).toMatch(/status:\s*authFailure\.status/)
    }
  })
})

describe('Admin dashboard endpoints response compatibility contract', () => {
  it('analytics endpoints keep legacy payload while adding ok=true', () => {
    expect(src.analytics).toMatch(/ok:\s*true/)
    expect(src.analytics).toMatch(/kpis:/)
    expect(src.analytics).toMatch(/revenueChart/)

    expect(src.analyticsSummary).toMatch(/ok:\s*true/)
    expect(src.analyticsSummary).toMatch(/today:/)
    expect(src.analyticsSummary).toMatch(/funnel:/)
  })

  it('payments endpoint keeps transactions/payouts while adding ok=true', () => {
    expect(src.payments).toMatch(/ok:\s*true/)
    expect(src.payments).toMatch(/transactions/)
    expect(src.payments).toMatch(/payouts/)
  })

  it('disputes endpoint keeps array payload and adds ok=true marker per item', () => {
    expect(src.disputes).toMatch(/map\(\(job:\s*any\)\s*=>\s*\(\{/)
    expect(src.disputes).toMatch(/ok:\s*true/)
    expect(src.disputes).toMatch(/return NextResponse\.json\(result\)/)
  })

  it('/admin/me keeps legacy admin payload and adds ok=true', () => {
    expect(src.me).toMatch(/ok:\s*true/)
    expect(src.me).toMatch(/admin:\s*\{/)
  })

  it('error payloads keep legacy error string and include canonical metadata', () => {
    for (const source of Object.values(src)) {
      expect(source).toMatch(/ok:\s*false/)
      expect(source).toMatch(/error:\s*['"`]/)
      expect(source).toMatch(/canonical_error:\s*\{/)
    }
  })
})
