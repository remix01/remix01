/**
 * parity-matrix.ts — Central migration registry for API response envelope parity.
 *
 * Single source of truth for:
 *   - Which routes are allowlisted (not yet on canonical envelope)
 *   - Their current envelope type, priority, and known blockers
 *   - Progress tracking (shrinking this list is the goal)
 *
 * All 83 entries from MUTATING_ALLOWLIST in api-response-policy-guard.contract.test.js
 * are recorded here with migration metadata.
 *
 * Canonical target: { ok: true, data: T } | { ok: false, error: { code, message } }
 * from lib/api/response.ts ok() / fail() helpers.
 */

export type MigrationStatus =
  | 'allowlisted'  // in the allowlist; not yet migrated
  | 'compliant'    // migrated to canonical ok/fail
  | 'blocked'      // blocked by external dependency (schema, table migration, etc.)
  | 'exempt'       // webhook/cron: internal only, different contract rules apply

export type EnvelopeType =
  | 'canonical'        // lib/api/response.ts ok() / fail()
  | 'legacy-apiSuccess'// lib/api-response.ts apiSuccess() / apiError()
  | 'legacy-http'      // lib/http/response.ts success() / error()
  | 'plain-json'       // NextResponse.json({ ... }) with no envelope wrapper
  | 'webhook-exempt'   // Stripe/Twilio/webhook receiver — envelope does not apply

export type Domain =
  | 'admin'
  | 'agent'
  | 'ai'
  | 'auth'
  | 'customer'
  | 'partner'
  | 'payment'
  | 'infra'
  | 'webhook'
  | 'cron'

export type Priority = 'P0' | 'P1' | 'P2' | 'P3'

export interface MigrationEntry {
  /** Path relative to project root, matching the allowlist key format */
  file: string
  domain: Domain
  priority: Priority
  status: MigrationStatus
  /** Current envelope type in the file */
  envelope: EnvelopeType
  /** ISO date string when first added to the allowlist */
  addedAt: string
  /** Target migration date (undefined = no deadline set) */
  migrateBy?: string
  /** Known blockers preventing immediate migration */
  blockers?: string[]
  /** Free-text notes */
  notes?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// THE MATRIX
// Entries must exactly match allowlist keys in api-response-policy-guard.
// Sorted by: priority ASC, domain, file.
// ─────────────────────────────────────────────────────────────────────────────

export const PARITY_MATRIX: readonly MigrationEntry[] = [
  // ── P0: Security-sensitive — auth, admin privileged actions, financial ───────

  { file: 'app/api/auth/accept-terms/route.ts',                    domain: 'auth',    priority: 'P0', status: 'blocked',    envelope: 'plain-json',       addedAt: '2026-04-27', blockers: ['legacy-table-write:user'],    notes: 'Writes to legacy user table; needs DAL first' },
  { file: 'app/api/auth/logout/route.ts',                          domain: 'auth',    priority: 'P0', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },

  { file: 'app/api/admin/craftworkers/[id]/suspend/route.ts',      domain: 'admin',   priority: 'P0', status: 'blocked',    envelope: 'plain-json',       addedAt: '2026-04-27', blockers: ['legacy-table-write:violation'], notes: 'See service-role-ownership-checklist.md' },
  { file: 'app/api/admin/craftworkers/[id]/unsuspend/route.ts',    domain: 'admin',   priority: 'P0', status: 'blocked',    envelope: 'plain-json',       addedAt: '2026-04-27', blockers: ['legacy-table-write:violation'] },
  { file: 'app/api/admin/disputes/[jobId]/resolve/route.ts',       domain: 'admin',   priority: 'P0', status: 'blocked',    envelope: 'plain-json',       addedAt: '2026-04-27', blockers: ['legacy-table-write:payment'] },
  { file: 'app/api/admin/escrow/resolve-dispute/route.ts',         domain: 'admin',   priority: 'P0', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },

  { file: 'app/api/payments/confirm-completion/route.ts',          domain: 'payment', priority: 'P0', status: 'blocked',    envelope: 'legacy-apiSuccess', addedAt: '2026-04-27', blockers: ['legacy-table-write:payment'] },
  { file: 'app/api/payments/dispute/route.ts',                     domain: 'payment', priority: 'P0', status: 'blocked',    envelope: 'legacy-apiSuccess', addedAt: '2026-04-27', blockers: ['legacy-table-write:payment'] },
  { file: 'app/api/payments/webhook/route.ts',                     domain: 'payment', priority: 'P0', status: 'exempt',     envelope: 'webhook-exempt',   addedAt: '2026-04-27', notes: 'Payment gateway receiver; not user-facing' },
  { file: 'app/api/payments/create-intent/route.ts',               domain: 'payment', priority: 'P0', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27', notes: 'Legacy namespace duplicate of stripe/payment/create-intent' },

  { file: 'app/api/escrow/create/route.ts',                        domain: 'payment', priority: 'P0', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/escrow/dispute/route.ts',                       domain: 'payment', priority: 'P0', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/escrow/refund/route.ts',                        domain: 'payment', priority: 'P0', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/escrow/release/route.ts',                       domain: 'payment', priority: 'P0', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },

  // ── P1: Core domain — tasks, offers, reviews, stripe checkout ───────────────

  { file: 'app/api/tasks/route.ts',                                domain: 'customer', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/tasks/[id]/assign/route.ts',                    domain: 'customer', priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/tasks/[id]/expire/route.ts',                    domain: 'customer', priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/tasks/[id]/publish/route.ts',                   domain: 'customer', priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },

  { file: 'app/api/reviews/create/route.ts',                       domain: 'customer', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/reviews/[id]/reply/route.ts',                   domain: 'customer', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },

  { file: 'app/api/rezervacija/route.ts',                          domain: 'customer', priority: 'P1', status: 'blocked',    envelope: 'legacy-apiSuccess', addedAt: '2026-04-27', blockers: ['legacy-table-write:rezervacije'], notes: 'TODO(migration): remove after 14 days post-DAL migration' },

  { file: 'app/api/ponudbe/route.ts',                              domain: 'partner', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },

  { file: 'app/api/stripe/connect/create-account/route.ts',        domain: 'payment', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/stripe/connect/create-onboarding-link/route.ts', domain: 'payment', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/stripe/payment/create-intent/route.ts',         domain: 'payment', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/stripe/payment/update-status/route.ts',         domain: 'payment', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/stripe/portal/route.ts',                        domain: 'payment', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/stripe/create-checkout/route.ts',               domain: 'payment', priority: 'P1', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },

  { file: 'app/api/agent/job-summary/route.ts',                    domain: 'agent',   priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27', notes: 'Plain JSON; frontend tightly coupled to response shape' },
  { file: 'app/api/agent/match/route.ts',                          domain: 'agent',   priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/agent/materials/route.ts',                      domain: 'agent',   priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/agent/quote-generator/route.ts',                domain: 'agent',   priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/agent/route.ts',                                domain: 'agent',   priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/agent/scheduling/confirm/route.ts',             domain: 'agent',   priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/agent/verify/route.ts',                         domain: 'agent',   priority: 'P1', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },

  // ── P2: Partner, v1 public API, push, calendar ──────────────────────────────

  { file: 'app/api/calendar/appointment/route.ts',                 domain: 'customer', priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },

  { file: 'app/api/push/send/route.ts',                            domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/push/subscribe/route.ts',                       domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/push/unsubscribe/route.ts',                     domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },

  { file: 'app/api/referrals/submit/route.ts',                     domain: 'partner', priority: 'P2', status: 'blocked',    envelope: 'legacy-apiSuccess', addedAt: '2026-04-27', blockers: ['legacy-table-write:rezervacije'] },

  { file: 'app/api/portfolio/upload/route.ts',                     domain: 'partner', priority: 'P2', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/registracija-mojster/route.ts',                 domain: 'partner', priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27', notes: 'Pending route-consolidation TODO' },
  { file: 'app/api/obrtniki/route.ts',                             domain: 'partner', priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27', notes: 'Deprecated namespace; schedule deletion' },
  { file: 'app/api/obrtniki/[id]/route.ts',                        domain: 'partner', priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27', notes: 'Deprecated namespace; schedule deletion' },

  { file: 'app/api/v1/analytics/track/route.ts',                   domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/v1/devices/register/route.ts',                  domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/v1/devices/[token]/route.ts',                   domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/v1/notifications/[id]/read/route.ts',           domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },
  { file: 'app/api/v1/notifications/read-all/route.ts',            domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },

  { file: 'app/api/admin/alerts/[id]/dismiss/route.ts',            domain: 'admin',   priority: 'P2', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/admin/categories/route.ts',                     domain: 'admin',   priority: 'P2', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/admin/events/replay/route.ts',                  domain: 'admin',   priority: 'P2', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/admin/migrate-all-partners/route.ts',           domain: 'admin',   priority: 'P2', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/admin/migrate-partner/route.ts',                domain: 'admin',   priority: 'P2', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/admin/settings/route.ts',                       domain: 'admin',   priority: 'P2', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },

  { file: 'app/api/matching/route.ts',                             domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/send-email/route.ts',                           domain: 'infra',   priority: 'P2', status: 'allowlisted', envelope: 'legacy-apiSuccess', addedAt: '2026-04-27' },

  // ── P3: Infra, AI utility, cron, webhooks, test/setup routes ────────────────

  { file: 'app/api/ai/analyze-image/route.ts',                     domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/analyze-inquiry/route.ts',                   domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/analyze-media/route.ts',                     domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/analyze-offers/route.ts',                    domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/categorize/route.ts',                        domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/chat/route.ts',                              domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/concierge/route.ts',                         domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/embed/route.ts',                             domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/generate-replies/route.ts',                  domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/home-advisor/route.ts',                      domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/langchain/route.ts',                         domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/optimize-route/route.ts',                    domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/ai/parse-inquiry/route.ts',                     domain: 'ai',      priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },

  { file: 'app/api/cron/backfill-embeddings/route.ts',             domain: 'cron',    priority: 'P3', status: 'exempt',     envelope: 'webhook-exempt',   addedAt: '2026-04-27', notes: 'Internal cron job; not user-facing' },
  { file: 'app/api/cron/sla-task-expiry/route.ts',                 domain: 'cron',    priority: 'P3', status: 'exempt',     envelope: 'webhook-exempt',   addedAt: '2026-04-27' },

  { file: 'app/api/webhooks/job-completed/route.ts',               domain: 'webhook', priority: 'P3', status: 'exempt',     envelope: 'webhook-exempt',   addedAt: '2026-04-27' },
  { file: 'app/api/webhooks/resend/route.ts',                      domain: 'webhook', priority: 'P3', status: 'exempt',     envelope: 'webhook-exempt',   addedAt: '2026-04-27' },
  { file: 'app/api/webhooks/stripe/route.ts',                      domain: 'webhook', priority: 'P3', status: 'exempt',     envelope: 'webhook-exempt',   addedAt: '2026-04-27' },
  { file: 'app/api/webhooks/twilio/post-event/route.ts',           domain: 'webhook', priority: 'P3', status: 'blocked',    envelope: 'webhook-exempt',   addedAt: '2026-04-27', blockers: ['legacy-table-write:conversation', 'legacy-table-write:message'] },
  { file: 'app/api/webhooks/twilio/pre-event/route.ts',            domain: 'webhook', priority: 'P3', status: 'blocked',    envelope: 'webhook-exempt',   addedAt: '2026-04-27', blockers: ['legacy-table-write:conversation', 'legacy-table-write:message'] },

  { file: 'app/api/admin/seo-insights/route.ts',                   domain: 'admin',   priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/admin/setup/route.ts',                          domain: 'admin',   priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/admin/test-slack/route.ts',                     domain: 'admin',   priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27', notes: 'Test/debug route; low migration urgency' },
  { file: 'app/api/admin/test-anthropic/route.ts',                 domain: 'admin',   priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27', notes: 'Test/debug route' },

  { file: 'app/api/setup/route.ts',                                domain: 'infra',   priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27' },
  { file: 'app/api/jobs/process/route.ts',                         domain: 'infra',   priority: 'P3', status: 'allowlisted', envelope: 'plain-json',       addedAt: '2026-04-27', notes: 'Background job processor; internal only' },
]

// ─────────────────────────────────────────────────────────────────────────────
// STATS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export interface ParityStats {
  total: number
  byStatus: Record<MigrationStatus, number>
  byPriority: Record<Priority, number>
  byDomain: Partial<Record<Domain, number>>
  /** Number of entries that need migration work (allowlisted + blocked) */
  pending: number
  /** Allowlist size — this must only decrease over time */
  allowlistSize: number
}

export function computeParityStats(): ParityStats {
  const byStatus: Record<MigrationStatus, number> = {
    allowlisted: 0, compliant: 0, blocked: 0, exempt: 0,
  }
  const byPriority: Record<Priority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 }
  const byDomain: Partial<Record<Domain, number>> = {}

  for (const entry of PARITY_MATRIX) {
    byStatus[entry.status]++
    byPriority[entry.priority]++
    byDomain[entry.domain] = (byDomain[entry.domain] ?? 0) + 1
  }

  return {
    total:         PARITY_MATRIX.length,
    byStatus,
    byPriority,
    byDomain,
    pending:       byStatus.allowlisted + byStatus.blocked,
    allowlistSize: byStatus.allowlisted + byStatus.blocked,
  }
}

/** Returns all entries for a given domain, sorted by priority */
export function getEntriesByDomain(domain: Domain): readonly MigrationEntry[] {
  return PARITY_MATRIX.filter(e => e.domain === domain)
    .sort((a, b) => a.priority.localeCompare(b.priority))
}

/** Returns all entries with a given blocker keyword */
export function getEntriesBlockedBy(blockerKeyword: string): readonly MigrationEntry[] {
  return PARITY_MATRIX.filter(e =>
    e.blockers?.some(b => b.includes(blockerKeyword))
  )
}

/** Returns files that are overdue (migrateBy date has passed) */
export function getOverdueEntries(asOf: Date = new Date()): readonly MigrationEntry[] {
  return PARITY_MATRIX.filter(e => {
    if (!e.migrateBy || e.status === 'compliant' || e.status === 'exempt') return false
    return new Date(e.migrateBy) < asOf
  })
}

/**
 * The canonical allowlist Set — must stay in sync with
 * __tests__/contract/api-response-policy-guard.contract.test.js.
 *
 * Includes all non-compliant entries (allowlisted + blocked + exempt),
 * which is exactly what MUTATING_ALLOWLIST contains.
 * Compliant entries have been removed from the allowlist so they're excluded here.
 */
export const MATRIX_FILE_SET: ReadonlySet<string> = new Set(
  PARITY_MATRIX
    .filter(e => e.status !== 'compliant')
    .map(e => e.file)
)
