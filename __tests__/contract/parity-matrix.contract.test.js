const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

// Dynamic require — ts-jest transforms the module at test runtime
const {
  PARITY_MATRIX,
  MATRIX_FILE_SET,
  computeParityStats,
} = require('../../lib/migration/parity-matrix')

// Must match MUTATING_ALLOWLIST in api-response-policy-guard.contract.test.js
const ALLOWLIST_BASELINE = 83

// Inline copy of MUTATING_ALLOWLIST to detect drift without coupling test files
const MUTATING_ALLOWLIST = new Set([
  'app/api/admin/alerts/[id]/dismiss/route.ts',
  'app/api/admin/categories/route.ts',
  'app/api/admin/craftworkers/[id]/suspend/route.ts',
  'app/api/admin/craftworkers/[id]/unsuspend/route.ts',
  'app/api/admin/disputes/[jobId]/resolve/route.ts',
  'app/api/admin/escrow/resolve-dispute/route.ts',
  'app/api/admin/events/replay/route.ts',
  'app/api/admin/migrate-all-partners/route.ts',
  'app/api/admin/migrate-partner/route.ts',
  'app/api/admin/seo-insights/route.ts',
  'app/api/admin/settings/route.ts',
  'app/api/admin/setup/route.ts',
  'app/api/admin/test-slack/route.ts',
  'app/api/agent/job-summary/route.ts',
  'app/api/agent/match/route.ts',
  'app/api/agent/materials/route.ts',
  'app/api/agent/quote-generator/route.ts',
  'app/api/agent/route.ts',
  'app/api/agent/scheduling/confirm/route.ts',
  'app/api/agent/verify/route.ts',
  'app/api/ai/analyze-image/route.ts',
  'app/api/ai/analyze-inquiry/route.ts',
  'app/api/ai/analyze-media/route.ts',
  'app/api/ai/analyze-offers/route.ts',
  'app/api/ai/categorize/route.ts',
  'app/api/ai/chat/route.ts',
  'app/api/ai/concierge/route.ts',
  'app/api/ai/embed/route.ts',
  'app/api/ai/generate-replies/route.ts',
  'app/api/ai/home-advisor/route.ts',
  'app/api/ai/langchain/route.ts',
  'app/api/ai/optimize-route/route.ts',
  'app/api/ai/parse-inquiry/route.ts',
  'app/api/auth/accept-terms/route.ts',
  'app/api/auth/logout/route.ts',
  'app/api/calendar/appointment/route.ts',
  'app/api/cron/backfill-embeddings/route.ts',
  'app/api/cron/sla-task-expiry/route.ts',
  'app/api/escrow/create/route.ts',
  'app/api/escrow/dispute/route.ts',
  'app/api/escrow/refund/route.ts',
  'app/api/escrow/release/route.ts',
  'app/api/payments/confirm-completion/route.ts',
  'app/api/payments/dispute/route.ts',
  'app/api/payments/webhook/route.ts',
  'app/api/ponudbe/route.ts',
  'app/api/push/send/route.ts',
  'app/api/push/subscribe/route.ts',
  'app/api/push/unsubscribe/route.ts',
  'app/api/referrals/submit/route.ts',
  'app/api/reviews/[id]/reply/route.ts',
  'app/api/reviews/create/route.ts',
  'app/api/rezervacija/route.ts',
  'app/api/send-email/route.ts',
  'app/api/setup/route.ts',
  'app/api/stripe/connect/create-account/route.ts',
  'app/api/stripe/connect/create-onboarding-link/route.ts',
  'app/api/stripe/payment/create-intent/route.ts',
  'app/api/stripe/payment/update-status/route.ts',
  'app/api/stripe/portal/route.ts',
  'app/api/tasks/[id]/assign/route.ts',
  'app/api/tasks/[id]/expire/route.ts',
  'app/api/tasks/[id]/publish/route.ts',
  'app/api/tasks/route.ts',
  'app/api/v1/analytics/track/route.ts',
  'app/api/v1/devices/[token]/route.ts',
  'app/api/v1/devices/register/route.ts',
  'app/api/v1/notifications/[id]/read/route.ts',
  'app/api/v1/notifications/read-all/route.ts',
  'app/api/webhooks/job-completed/route.ts',
  'app/api/webhooks/resend/route.ts',
  'app/api/webhooks/stripe/route.ts',
  'app/api/webhooks/twilio/post-event/route.ts',
  'app/api/webhooks/twilio/pre-event/route.ts',
  'app/api/obrtniki/[id]/route.ts',
  'app/api/obrtniki/route.ts',
  'app/api/payments/create-intent/route.ts',
  'app/api/portfolio/upload/route.ts',
  'app/api/registracija-mojster/route.ts',
  'app/api/admin/test-anthropic/route.ts',
  'app/api/stripe/create-checkout/route.ts',
  'app/api/matching/route.ts',
  'app/api/jobs/process/route.ts',
])

const root = process.cwd()

function fileExists(file) {
  return fs.existsSync(path.join(root, file))
}

function readSource(file) {
  return fs.readFileSync(path.join(root, file), 'utf8')
}

function hasCanonicalHelperUsage(source) {
  return /from ['"]@\/lib\/api\/response['"]/.test(source) &&
    /\bok\(/.test(source) &&
    /\bfail\(/.test(source)
}

describe('parity-matrix contract', () => {
  it('every matrix entry points to a real file on disk', () => {
    const missing = PARITY_MATRIX.filter(e => !fileExists(e.file)).map(e => e.file)
    expect(missing).toEqual([])
  })

  it('no file appears in the matrix more than once', () => {
    const seen = new Set()
    const duplicates = []
    for (const entry of PARITY_MATRIX) {
      if (seen.has(entry.file)) duplicates.push(entry.file)
      seen.add(entry.file)
    }
    expect(duplicates).toEqual([])
  })

  it('entries marked compliant actually use canonical ok()/fail() helpers', () => {
    const violations = PARITY_MATRIX
      .filter(e => e.status === 'compliant')
      .filter(e => !hasCanonicalHelperUsage(readSource(e.file)))
      .map(e => e.file)
    expect(violations).toEqual([])
  })

  it('MATRIX_FILE_SET covers every file in MUTATING_ALLOWLIST (no gaps)', () => {
    const missing = []
    for (const file of MUTATING_ALLOWLIST) {
      if (!MATRIX_FILE_SET.has(file)) missing.push(file)
    }
    expect(missing).toEqual([])
  })

  it('every file in MATRIX_FILE_SET appears in MUTATING_ALLOWLIST (no phantom entries)', () => {
    const phantom = []
    for (const file of MATRIX_FILE_SET) {
      if (!MUTATING_ALLOWLIST.has(file)) phantom.push(file)
    }
    expect(phantom).toEqual([])
  })

  it('total non-compliant entries do not exceed the allowlist baseline', () => {
    const nonCompliant = PARITY_MATRIX.filter(e => e.status !== 'compliant').length
    expect(nonCompliant).toBeLessThanOrEqual(ALLOWLIST_BASELINE)
  })

  it('all matrix domains are valid values', () => {
    const VALID_DOMAINS = new Set(['admin', 'agent', 'ai', 'auth', 'customer', 'partner', 'payment', 'infra', 'webhook', 'cron'])
    const invalid = PARITY_MATRIX
      .filter(e => !VALID_DOMAINS.has(e.domain))
      .map(e => `${e.file} (domain=${e.domain})`)
    expect(invalid).toEqual([])
  })

  it('all matrix priorities are valid values', () => {
    const VALID_PRIORITIES = new Set(['P0', 'P1', 'P2', 'P3'])
    const invalid = PARITY_MATRIX.filter(e => !VALID_PRIORITIES.has(e.priority)).map(e => e.file)
    expect(invalid).toEqual([])
  })

  it('blocked entries have at least one blocker listed', () => {
    const missingBlockers = PARITY_MATRIX
      .filter(e => e.status === 'blocked' && (!e.blockers || e.blockers.length === 0))
      .map(e => e.file)
    expect(missingBlockers).toEqual([])
  })

  it('exempt entries belong to webhook, cron, or payment domains', () => {
    const EXEMPT_DOMAINS = new Set(['webhook', 'cron', 'payment'])
    const wrongDomain = PARITY_MATRIX
      .filter(e => e.status === 'exempt' && !EXEMPT_DOMAINS.has(e.domain))
      .map(e => `${e.file} (domain=${e.domain})`)
    expect(wrongDomain).toEqual([])
  })
})
