const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

const FILES = {
  // framework + mocks inventory
  jestEscrowConfig: 'jest.config.escrow.cjs',
  mockStripe: '__tests__/integration/helpers/mockStripe.ts',
  testDb: '__tests__/integration/helpers/testDb.ts',
  testUsers: '__tests__/integration/helpers/testUsers.ts',

  // partner dashboard APIs
  partnerInquiries: 'app/api/partner/povprasevanja/route.ts',
  partnerOffers: 'app/api/partner/offers/route.ts',
  partnerCRM: 'app/api/partner/crm/route.ts',
  partnerPayments: 'app/api/partner/commissions/route.ts',

  // admin dashboard APIs
  adminAnalytics: 'app/api/admin/analytics/route.ts',
  adminPayments: 'app/api/admin/payments/route.ts',
  adminDisputes: 'app/api/admin/disputes/route.ts',
  adminMe: 'app/api/admin/me/route.ts',

  // customer APIs
  customerInquiries: 'app/api/povprasevanje/route.ts',
  customerInquiryDetail: 'app/api/povprasevanje/[id]/route.ts',
  customerMessages: 'app/api/conversations/token/route.ts',

  // agent APIs
  agentChat: 'app/api/agent/chat/route.ts',
  agentType: 'app/api/agent/[agentType]/route.ts',
}

const src = Object.fromEntries(
  Object.entries(FILES).map(([key, file]) => [key, read(file)])
)

describe('Test framework + existing mocks inventory', () => {
  it('escrow jest config is scoped and contract tests remain source-contract based', () => {
    expect(src.jestEscrowConfig).toMatch(/testMatch:\s*\['\*\*\/__tests__\/escrow\/\*\*\/\*\.test\.ts'\]/)
    expect(src.jestEscrowConfig).toMatch(/testEnvironment:\s*'node'/)
  })

  it('integration helper mocks exist (stripe/db/users)', () => {
    expect(src.mockStripe).toMatch(/mockStripe/)
    expect(src.mockStripe).toMatch(/jest\.fn\(/)

    expect(src.testDb).toMatch(/export const testDb/)
    expect(src.testUsers).toMatch(/export const testUser/)
    expect(src.testUsers).toMatch(/export const testPartner/)
    expect(src.testUsers).toMatch(/export const testAdmin/)
  })
})

describe('Dashboard/API envelope matrix', () => {
  it('partner inquiries/offers/CRM/payments use canonical envelope helper (migrated)', () => {
    for (const source of [src.partnerInquiries, src.partnerOffers, src.partnerCRM, src.partnerPayments]) {
      expect(source).toMatch(/from ['"]@\/lib\/api\/response['"]/)
      expect(source).toMatch(/\bok\(/)
      expect(source).toMatch(/\bfail\(/)
    }
  })

  it('admin analytics/payments/disputes/me keep canonical envelope + auth canonical_error branches', () => {
    for (const source of [src.adminAnalytics, src.adminPayments, src.adminDisputes, src.adminMe]) {
      expect(source).toMatch(/requireAdmin\(/)
      expect(source).toMatch(/toAdminAuthFailure\(error\)/)
      expect(source).toMatch(/ok:\s*true/)
      expect(source).toMatch(/ok:\s*false/)
      expect(source).toMatch(/canonical_error:\s*\{/) 
      expect(source).toMatch(/UNAUTHORIZED|FORBIDDEN/)
    }
  })

  it('agent chat/agentType keep dual-shape compatibility (ok/data + legacy top-level fields)', () => {
    for (const source of [src.agentChat, src.agentType]) {
      expect(source).toMatch(/ok:\s*true/)
      expect(source).toMatch(/data:\s*payload/)
      expect(source).toMatch(/\.\.\.payload/)
      expect(source).toMatch(/ok:\s*false/)
      expect(source).toMatch(/canonical_error:\s*\{/) 
    }

    expect(src.agentChat).toMatch(/return success\(\{ messages:/)
    expect(src.agentChat).toMatch(/return success\(\{\s*message:/)
    expect(src.agentType).toMatch(/return success\(\{\s*messages:/)
    expect(src.agentType).toMatch(/return success\(\{\s*message:/)
  })

  it('customer inquiries/profile/messages matrix: mixed compatibility + legacy where migration is risky', () => {
    // customer inquiries routes already use compatibility wrapper
    for (const source of [src.customerInquiries, src.customerInquiryDetail]) {
      expect(source).toMatch(/ok:\s*true/)
      expect(source).toMatch(/ok:\s*false/)
      expect(source).toMatch(/error_details:\s*\{/) // legacy-compatible error payload key retained
      expect(source).toMatch(/UNAUTHORIZED/)
    }

    // customer messages token route is intentionally legacy/plain JSON for now
    expect(src.customerMessages).toMatch(/NextResponse\.json\(\s*\{ error: 'Unauthorized' \},\s*\{ status: 401 \}\s*\)/)
    expect(src.customerMessages).toMatch(/NextResponse\.json\(\s*\{\s*token:/)
    expect(src.customerMessages).not.toMatch(/canonical_error/) // not migrated yet
    expect(src.customerMessages).not.toMatch(/ok:\s*true/) // legacy shape remains
  })
})

describe('Unauthorized/Forbidden/Not Found coverage (representative)', () => {
  it('contains unauthorized branches across partner/customer/agent/admin', () => {
    expect(src.partnerInquiries).toMatch(/UNAUTHORIZED/)
    expect(src.partnerOffers).toMatch(/UNAUTHORIZED/)
    expect(src.partnerCRM).toMatch(/UNAUTHORIZED/)
    expect(src.partnerPayments).toMatch(/UNAUTHORIZED/)

    expect(src.customerInquiries).toMatch(/UNAUTHORIZED/)
    expect(src.customerInquiryDetail).toMatch(/UNAUTHORIZED/)
    expect(src.customerMessages).toMatch(/Unauthorized/)

    expect(src.agentChat).toMatch(/UNAUTHORIZED/)
    expect(src.agentType).toMatch(/UNAUTHORIZED/)

    expect(src.adminAnalytics).toMatch(/UNAUTHORIZED/)
    expect(src.adminPayments).toMatch(/UNAUTHORIZED/)
    expect(src.adminDisputes).toMatch(/UNAUTHORIZED/)
    expect(src.adminMe).toMatch(/UNAUTHORIZED/)
  })

  it('contains forbidden and not found branches where expected', () => {
    expect(src.adminAnalytics).toMatch(/FORBIDDEN/)
    expect(src.adminPayments).toMatch(/FORBIDDEN/)
    expect(src.adminDisputes).toMatch(/FORBIDDEN/)
    expect(src.adminMe).toMatch(/FORBIDDEN/)

    expect(src.customerInquiryDetail).toMatch(/NOT_FOUND/)
  })
})
