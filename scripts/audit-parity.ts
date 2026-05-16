#!/usr/bin/env ts-node
/**
 * audit-parity.ts — API Response Envelope Parity Report
 *
 * Scans all app/api route files, detects their envelope type,
 * cross-references the parity matrix, and prints a migration progress report.
 *
 * Usage:
 *   npx ts-node --project tsconfig.scripts.json scripts/audit-parity.ts
 *   npx ts-node --project tsconfig.scripts.json scripts/audit-parity.ts --domain agent
 *   npx ts-node --project tsconfig.scripts.json scripts/audit-parity.ts --priority P0
 *   npx ts-node --project tsconfig.scripts.json scripts/audit-parity.ts --json
 *
 * The allowlist count in this report MUST ONLY DECREASE over time.
 * Ratchet check: compare `allowlistSize` against the BASELINE_ALLOWLIST_COUNT.
 */

import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import {
  PARITY_MATRIX,
  MATRIX_FILE_SET,
  computeParityStats,
  getOverdueEntries,
  type Domain,
  type Priority,
  type MigrationStatus,
  type EnvelopeType,
} from '../lib/migration/parity-matrix'

// ─── Ratchet baseline ────────────────────────────────────────────────────────
// This number must only go down. Update it after each successful migration batch.
const BASELINE_ALLOWLIST_COUNT = 83

// ─── CLI args ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const filterDomain = args.includes('--domain') ? args[args.indexOf('--domain') + 1] as Domain : undefined
const filterPriority = args.includes('--priority') ? args[args.indexOf('--priority') + 1] as Priority : undefined
const jsonMode = args.includes('--json')

// ─── Envelope detection ──────────────────────────────────────────────────────

function detectEnvelope(source: string): EnvelopeType {
  if (!/export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)|export\s+const\s+(POST|PUT|PATCH|DELETE)\s*=/.test(source)) {
    return 'plain-json' // read-only; not relevant for mutating check
  }

  const hasCanonical = /from ['"]@\/lib\/api\/response['"]/.test(source) &&
    /\bok\(/.test(source) && /\bfail\(/.test(source)
  if (hasCanonical) return 'canonical'

  if (/from ['"]@\/lib\/api-response['"]/.test(source) &&
      (/apiSuccess\(/.test(source) || /apiError\(/.test(source))) {
    return 'legacy-apiSuccess'
  }

  if (/from ['"]@\/lib\/http\/response['"]/.test(source) &&
      (/\.success\(/.test(source) || /\.error\(/.test(source))) {
    return 'legacy-http'
  }

  // Webhooks from Stripe/Twilio/Resend typically just return 200 ACK
  if (/stripe-signature|twilio|resend.*webhook/i.test(source)) return 'webhook-exempt'

  return 'plain-json'
}

// ─── Route discovery ─────────────────────────────────────────────────────────

function listRouteFiles(): string[] {
  try {
    const out = execSync("rg --files app/api -g 'route.ts'", {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    }).trim()
    return out ? out.split('\n') : []
  } catch {
    // fallback: find
    const out = execSync("find app/api -name 'route.ts'", {
      cwd: path.resolve(__dirname, '..'),
      encoding: 'utf8',
    }).trim()
    return out ? out.split('\n') : []
  }
}

// ─── Divergence analysis ─────────────────────────────────────────────────────

interface FileScan {
  file: string
  detectedEnvelope: EnvelopeType
  matrixStatus: MigrationStatus | 'not-in-matrix' | 'exempt'
  matrixEnvelope: EnvelopeType | undefined
  divergent: boolean
  divergenceReason?: string
}

function scanFiles(routeFiles: string[]): FileScan[] {
  const root = path.resolve(__dirname, '..')
  const results: FileScan[] = []

  for (const file of routeFiles) {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
    const detectedEnvelope = detectEnvelope(source)

    const entry = PARITY_MATRIX.find(e => e.file === file)
    if (!entry) {
      // Not in matrix — should be compliant (not in allowlist either means it passed the gate)
      const hasMutating = /export\s+(?:async\s+)?function\s+(POST|PUT|PATCH|DELETE)|export\s+const\s+(POST|PUT|PATCH|DELETE)\s*=/.test(source)
      if (!hasMutating) continue // GET-only routes: skip

      results.push({
        file,
        detectedEnvelope,
        matrixStatus: 'not-in-matrix',
        matrixEnvelope: undefined,
        divergent: detectedEnvelope !== 'canonical' && detectedEnvelope !== 'webhook-exempt',
        divergenceReason: detectedEnvelope !== 'canonical' ? `Mutating route not in matrix and not canonical (${detectedEnvelope})` : undefined,
      })
      continue
    }

    const divergent = entry.status !== 'exempt' &&
      entry.status !== 'compliant' &&
      detectedEnvelope === 'canonical'

    results.push({
      file,
      detectedEnvelope,
      matrixStatus: entry.status,
      matrixEnvelope: entry.envelope,
      divergent,
      divergenceReason: divergent
        ? `Matrix says ${entry.status}/${entry.envelope} but file now uses canonical — update matrix!`
        : undefined,
    })
  }

  return results
}

// ─── Report rendering ─────────────────────────────────────────────────────────

function printReport(scans: FileScan[]) {
  const stats = computeParityStats()
  const overdue = getOverdueEntries()

  const ratchetOk = stats.allowlistSize <= BASELINE_ALLOWLIST_COUNT
  const matrixDrifts = scans.filter(s => s.divergent)

  // Filter for display
  let displayMatrix = [...PARITY_MATRIX]
  if (filterDomain) displayMatrix = displayMatrix.filter(e => e.domain === filterDomain)
  if (filterPriority) displayMatrix = displayMatrix.filter(e => e.priority === filterPriority)

  const divider = '─'.repeat(80)

  console.log('\n' + divider)
  console.log('  API RESPONSE ENVELOPE PARITY REPORT')
  console.log(`  Generated: ${new Date().toISOString()}`)
  console.log(divider)

  console.log('\n📊 SUMMARY')
  console.log(`  Total matrix entries : ${stats.total}`)
  console.log(`  ✅ Compliant         : ${stats.byStatus.compliant}`)
  console.log(`  🔴 Allowlisted       : ${stats.byStatus.allowlisted}`)
  console.log(`  🟡 Blocked           : ${stats.byStatus.blocked}`)
  console.log(`  ⚪ Exempt            : ${stats.byStatus.exempt}`)
  console.log(`  ⚠️  Pending total     : ${stats.pending}`)

  console.log('\n📈 RATCHET CHECK')
  const ratchetIcon = ratchetOk ? '✅' : '🚨'
  console.log(`  ${ratchetIcon} Allowlist size: ${stats.allowlistSize} / baseline ${BASELINE_ALLOWLIST_COUNT}`)
  if (!ratchetOk) {
    console.log('  🚨 ALLOWLIST HAS GROWN — new routes were added without migration!')
    console.log('     Fix: migrate new routes before merging, or update BASELINE after team approval.')
  }

  console.log('\n📋 BY PRIORITY')
  for (const [p, count] of Object.entries(stats.byPriority).sort()) {
    const icon = p === 'P0' ? '🔴' : p === 'P1' ? '🟠' : p === 'P2' ? '🟡' : '⚪'
    const pending = PARITY_MATRIX
      .filter(e => e.priority === p && (e.status === 'allowlisted' || e.status === 'blocked'))
      .length
    console.log(`  ${icon} ${p}: ${count} total, ${pending} pending`)
  }

  console.log('\n🏗️  BY DOMAIN')
  for (const [domain, count] of Object.entries(stats.byDomain).sort()) {
    const pending = PARITY_MATRIX
      .filter(e => e.domain === domain && (e.status === 'allowlisted' || e.status === 'blocked'))
      .length
    console.log(`  ${domain.padEnd(12)} ${count} total, ${pending} pending`)
  }

  if (overdue.length > 0) {
    console.log('\n⏰ OVERDUE (past migrateBy date)')
    for (const e of overdue) {
      console.log(`  [${e.priority}] ${e.file}  (due: ${e.migrateBy})`)
    }
  }

  if (matrixDrifts.length > 0) {
    console.log('\n🔄 MATRIX DRIFT DETECTED')
    console.log('  These files appear to be compliant in code but not updated in the matrix:')
    for (const d of matrixDrifts) {
      console.log(`  → ${d.file}`)
      console.log(`    ${d.divergenceReason}`)
    }
  }

  if (displayMatrix.filter(e => e.status !== 'compliant' && e.status !== 'exempt').length > 0) {
    const header = filterDomain || filterPriority
      ? `\n🗂️  PENDING ENTRIES${filterDomain ? ` [domain=${filterDomain}]` : ''}${filterPriority ? ` [priority=${filterPriority}]` : ''}`
      : '\n🗂️  P0 PENDING ENTRIES (security-sensitive)'

    console.log(header)
    const toShow = displayMatrix.filter(e =>
      (e.status === 'allowlisted' || e.status === 'blocked') &&
      (!filterPriority ? e.priority === 'P0' : true)
    )
    for (const e of toShow) {
      const statusIcon = e.status === 'blocked' ? '🔒' : '🔴'
      console.log(`  ${statusIcon} [${e.priority}/${e.domain}] ${e.file}`)
      if (e.blockers?.length) console.log(`       blockers: ${e.blockers.join(', ')}`)
      if (e.notes) console.log(`       note: ${e.notes}`)
    }
  }

  console.log('\n' + divider)
  console.log('  To migrate a route: add canonical ok()/fail() from @/lib/api/response,')
  console.log('  remove its entry from MUTATING_ALLOWLIST, update parity-matrix.ts status.')
  console.log(divider + '\n')

  process.exit(!ratchetOk || matrixDrifts.length > 0 ? 1 : 0)
}

function printJson(scans: FileScan[]) {
  const stats = computeParityStats()
  const overdue = getOverdueEntries()
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    stats,
    ratchet: {
      baseline: BASELINE_ALLOWLIST_COUNT,
      current: stats.allowlistSize,
      ok: stats.allowlistSize <= BASELINE_ALLOWLIST_COUNT,
    },
    overdue: overdue.map(e => e.file),
    matrixDrift: scans.filter(s => s.divergent).map(s => ({
      file: s.file,
      reason: s.divergenceReason,
    })),
    matrix: PARITY_MATRIX,
  }, null, 2))
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const routeFiles = listRouteFiles()
const scans = scanFiles(routeFiles)

if (jsonMode) {
  printJson(scans)
} else {
  printReport(scans)
}
