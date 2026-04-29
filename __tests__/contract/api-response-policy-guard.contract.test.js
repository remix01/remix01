const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const API_ROOT = path.join(process.cwd(), 'app', 'api')

// Transitional allowlist for known legacy mutating endpoints.
// TODO(response-policy): remove entries incrementally as routes adopt canonical helper
// or compatibility ok-shape without changing business logic.
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
  'app/api/admin/test-anthropic/route.ts',
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
  'app/api/jobs/process/route.ts',
  'app/api/matching/route.ts',
  'app/api/obrtniki/[id]/route.ts',
  'app/api/obrtniki/route.ts',
  'app/api/payments/confirm-completion/route.ts',
  'app/api/payments/create-intent/route.ts',
  'app/api/payments/dispute/route.ts',
  'app/api/payments/webhook/route.ts',
  'app/api/ponudbe/route.ts',
  'app/api/portfolio/upload/route.ts',
  'app/api/push/send/route.ts',
  'app/api/push/subscribe/route.ts',
  'app/api/push/unsubscribe/route.ts',
  'app/api/referrals/submit/route.ts',
  'app/api/registracija-mojster/route.ts',
  'app/api/narocnik/povprasevanje/route.ts',
  'app/api/stranka/povprasevanje/route.ts',
  'app/api/reviews/[id]/reply/route.ts',
  'app/api/reviews/create/route.ts',
  'app/api/rezervacija/route.ts',
  'app/api/send-email/route.ts',
  'app/api/setup/route.ts',
  'app/api/stripe/connect/create-account/route.ts',
  'app/api/stripe/connect/create-onboarding-link/route.ts',
  'app/api/stripe/create-checkout/route.ts',
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
])

function listRouteFiles(dir = API_ROOT) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const out = []
  for (const entry of entries) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...listRouteFiles(full))
      continue
    }
    if (entry.isFile() && entry.name === 'route.ts') {
      out.push(path.relative(process.cwd(), full).replace(/\\/g, '/'))
    }
  }
  return out
}

function hasMutatingMethod(source) {
  const hasInlineMethod = /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)\s*\(/.test(source) ||
    /export\s+const\s+(POST|PUT|PATCH|DELETE)\s*=/.test(source)

  const hasMutatingReExport = /export\s*\{[^}]*\b(POST|PUT|PATCH|DELETE)\b[^}]*\}\s*from\s*['"][^'"]+['"]/.test(source)

  return hasInlineMethod || hasMutatingReExport
}

function hasCanonicalHelperUsage(source) {
  const importsCanonicalHelper = /from ['"]@\/lib\/api\/response['"]/.test(source)
  return importsCanonicalHelper && /\bok\(/.test(source) && /\bfail\(/.test(source)
}

function hasCompatibilityOkShape(source) {
  return /ok:\s*true/.test(source) && (
    /data:\s*/.test(source) ||
    /\.\.\.legacy/.test(source) ||
    /legacy_error\s*:/.test(source)
  )
}

describe('API response policy guard (mutating endpoints)', () => {
  const files = listRouteFiles()

  it('all non-allowlisted mutating routes use canonical helper or compatibility ok-shape', () => {
    const violations = []

    for (const file of files) {
      const source = fs.readFileSync(path.join(process.cwd(), file), 'utf8')
      if (!hasMutatingMethod(source)) continue
      if (MUTATING_ALLOWLIST.has(file)) continue

      const compliant = hasCanonicalHelperUsage(source) || hasCompatibilityOkShape(source)

      if (!compliant) violations.push(file)
    }

    expect(violations).toEqual([])
  })

  it('allowlisted entries are real route files', () => {
    for (const file of MUTATING_ALLOWLIST) {
      expect(files).toContain(file)
    }
  })
})
