import 'server-only'

import { Sandbox } from '@e2b/code-interpreter'
import { env } from '@/lib/env'

export type SandboxLanguage = 'python' | 'nodejs'

export interface SandboxTierPolicy {
  runsPerDay: number | 'unlimited'
  maxRuntimeMs: number
  maxActiveSandboxes: number
  monthlyComputeBudgetUsd?: number
}

export interface SandboxExecutionRequest {
  userId: string
  code: string
  language: SandboxLanguage
  tier: string
  sandboxId?: string
}

export interface SandboxExecutionResult {
  sandboxId: string
  stdout: string
  stderr: string
  exitCode: number
  runtimeMs: number
  timedOut: boolean
  truncated: { stdout: boolean; stderr: boolean }
}

export type SandboxBlockedReason =
  | 'FEATURE_DISABLED'
  | 'MISSING_API_KEY'
  | 'INVALID_LANGUAGE'
  | 'INVALID_CODE'
  | 'PAYLOAD_TOO_LARGE'
  | 'DANGEROUS_PATTERN'
  | 'QUOTA_EXCEEDED'
  | 'CONCURRENCY_LIMIT'
  | 'RUNTIME_LIMIT'
  | 'SANDBOX_REUSE_DENIED'
  | 'INTERNAL_ERROR'

export class SandboxPolicyError extends Error {
  constructor(public readonly reason: SandboxBlockedReason, message: string, public readonly status = 400) {
    super(message)
    this.name = 'SandboxPolicyError'
  }
}

const MAX_CODE_CHARS = 25_000
const MAX_OUTPUT_CHARS = 16_000
const MAX_REUSE_AGE_MS = 10 * 60 * 1000
const REPEATED_WINDOW_MS = 60_000
const REPEATED_LIMIT = 8

const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+\//i,
  /shutdown\b/i,
  /reboot\b/i,
  /fork\s*\(/i,
  /while\s*\(\s*true\s*\)/i,
  /require\(['"]child_process['"]\)\.exec/i,
  /os\.system\(/i,
]

const TEMPLATE_MAP: Record<SandboxLanguage, string> = {
  python: 'base',
  nodejs: 'base',
}

const TIER_POLICIES: Record<string, SandboxTierPolicy> = {
  start: { runsPerDay: 20, maxRuntimeMs: 45_000, maxActiveSandboxes: 2 },
  pro: { runsPerDay: 100, maxRuntimeMs: 90_000, maxActiveSandboxes: 5 },
  elite: { runsPerDay: 300, maxRuntimeMs: 120_000, maxActiveSandboxes: 10 },
  enterprise: { runsPerDay: 'unlimited', maxRuntimeMs: 180_000, maxActiveSandboxes: 20, monthlyComputeBudgetUsd: 0 },
}

const sessionTracker = new Map<string, Map<string, number>>()
const usageTracker = new Map<string, { day: string; runs: number }>()
const repeatTracker = new Map<string, { ts: number[]; lastHash: string }>()

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function hashCode(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) h = ((h << 5) - h) + input.charCodeAt(i)
  return String(h)
}

function trimOutput(text: string): { value: string; truncated: boolean } {
  if (text.length <= MAX_OUTPUT_CHARS) return { value: text, truncated: false }
  return { value: `${text.slice(0, MAX_OUTPUT_CHARS)}\n...[truncated]`, truncated: true }
}

function getTierPolicy(tier: string): SandboxTierPolicy {
  return TIER_POLICIES[tier] ?? TIER_POLICIES.start
}

export function getSandboxTierPolicy(tier: string): SandboxTierPolicy {
  return getTierPolicy(tier)
}

function ensureFeatureEnabled() {
  if ((process.env.AI_SANDBOX_ENABLED ?? 'true') !== 'true') {
    throw new SandboxPolicyError('FEATURE_DISABLED', 'AI sandbox feature is disabled.', 503)
  }
}

function assertCodeSafe(code: string): void {
  if (!code || !code.trim()) throw new SandboxPolicyError('INVALID_CODE', 'Code is required.', 400)
  if (code.length > MAX_CODE_CHARS) throw new SandboxPolicyError('PAYLOAD_TOO_LARGE', `Code payload too large (max ${MAX_CODE_CHARS}).`, 413)
  if (DANGEROUS_PATTERNS.some((p) => p.test(code))) {
    throw new SandboxPolicyError('DANGEROUS_PATTERN', 'Blocked potentially dangerous code pattern.', 400)
  }
}

export interface SandboxAuditLogger {
  onSessionCreated?(event: Record<string, unknown>): Promise<void> | void
  onExecutionCompleted?(event: Record<string, unknown>): Promise<void> | void
  onBlocked?(event: Record<string, unknown>): Promise<void> | void
  onQuotaExceeded?(event: Record<string, unknown>): Promise<void> | void
  onTimeoutKilled?(event: Record<string, unknown>): Promise<void> | void
}

const defaultLogger: SandboxAuditLogger = {
  onSessionCreated: async (event) => { console.info('[sandbox][session_created]', event) },
  onExecutionCompleted: async (event) => { console.info('[sandbox][execution_completed]', event) },
  onBlocked: async (event) => { console.warn('[sandbox][blocked]', event) },
  onQuotaExceeded: async (event) => { console.warn('[sandbox][quota_exceeded]', event) },
  onTimeoutKilled: async (event) => { console.warn('[sandbox][timeout_killed]', event) },
}

export async function executeSandboxCode(
  input: SandboxExecutionRequest,
  logger: SandboxAuditLogger = defaultLogger,
): Promise<SandboxExecutionResult> {
  ensureFeatureEnabled()
  if (!env.E2B_API_KEY) throw new SandboxPolicyError('MISSING_API_KEY', 'E2B API key is not configured.', 503)
  if (!TEMPLATE_MAP[input.language]) throw new SandboxPolicyError('INVALID_LANGUAGE', 'Unsupported language.', 400)

  assertCodeSafe(input.code)

  const policy = getTierPolicy(input.tier)
  const day = todayKey()
  const usage = usageTracker.get(input.userId)
  const currentRuns = usage?.day === day ? usage.runs : 0
  if (policy.runsPerDay !== 'unlimited' && currentRuns >= policy.runsPerDay) {
    await logger.onQuotaExceeded?.({ userId: input.userId, tier: input.tier, runs: currentRuns, limit: policy.runsPerDay, ts: new Date().toISOString() })
    throw new SandboxPolicyError('QUOTA_EXCEEDED', `Sandbox daily quota exceeded (${policy.runsPerDay}).`, 429)
  }

  const repeated = repeatTracker.get(input.userId) ?? { ts: [], lastHash: '' }
  const now = Date.now()
  repeated.ts = repeated.ts.filter((n) => now - n < REPEATED_WINDOW_MS)
  const codeHash = hashCode(input.code)
  if (repeated.lastHash === codeHash && repeated.ts.length >= REPEATED_LIMIT) {
    throw new SandboxPolicyError('QUOTA_EXCEEDED', 'Too many repeated executions. Please wait.', 429)
  }
  repeated.lastHash = codeHash
  repeated.ts.push(now)
  repeatTracker.set(input.userId, repeated)

  const activeMap = sessionTracker.get(input.userId) ?? new Map<string, number>()
  for (const [id, created] of activeMap.entries()) {
    if (now - created > MAX_REUSE_AGE_MS) activeMap.delete(id)
  }

  let sandbox: any
  const connecting = Boolean(input.sandboxId)
  if (connecting) {
    if (!activeMap.has(input.sandboxId!)) {
      throw new SandboxPolicyError('SANDBOX_REUSE_DENIED', 'Sandbox reuse denied.', 403)
    }
    sandbox = await (Sandbox as any).connect(input.sandboxId, { apiKey: env.E2B_API_KEY })
  } else {
    if (activeMap.size >= policy.maxActiveSandboxes) {
      await logger.onBlocked?.({ userId: input.userId, reason: 'CONCURRENCY_LIMIT', active: activeMap.size, limit: policy.maxActiveSandboxes, ts: new Date().toISOString() })
      throw new SandboxPolicyError('CONCURRENCY_LIMIT', `Too many active sandboxes (${policy.maxActiveSandboxes}).`, 429)
    }
    sandbox = await (Sandbox as any).create({ apiKey: env.E2B_API_KEY, timeoutMs: policy.maxRuntimeMs })
    activeMap.set(sandbox.sandboxId, now)
    sessionTracker.set(input.userId, activeMap)
    await logger.onSessionCreated?.({ userId: input.userId, sandboxId: sandbox.sandboxId, language: input.language, template: TEMPLATE_MAP[input.language], tier: input.tier, ts: new Date().toISOString() })
  }

  const command = input.language === 'python' ? `python -c ${JSON.stringify(input.code)}` : `node -e ${JSON.stringify(input.code)}`
  const startedAt = Date.now()

  try {
    const execution = await sandbox.commands.run(command, { timeoutMs: policy.maxRuntimeMs })
    const runtimeMs = Date.now() - startedAt
    const stdout = trimOutput(execution.stdout ?? '')
    const stderr = trimOutput(execution.stderr ?? '')

    usageTracker.set(input.userId, { day, runs: currentRuns + 1 })

    await logger.onExecutionCompleted?.({
      userId: input.userId,
      sandboxId: sandbox.sandboxId,
      language: input.language,
      runtimeMs,
      exitCode: execution.exitCode,
      stdoutSize: stdout.value.length,
      stderrSize: stderr.value.length,
      stdoutTruncated: stdout.truncated,
      stderrTruncated: stderr.truncated,
      estimatedComputeCostUsd: null, // TODO: derive when pricing model is finalized.
      ts: new Date().toISOString(),
    })

    return {
      sandboxId: sandbox.sandboxId,
      stdout: stdout.value,
      stderr: stderr.value,
      exitCode: execution.exitCode,
      runtimeMs,
      timedOut: false,
      truncated: { stdout: stdout.truncated, stderr: stderr.truncated },
    }
  } catch (error) {
    const runtimeMs = Date.now() - startedAt
    const message = error instanceof Error ? error.message : 'Execution failed'
    const timedOut = /timeout/i.test(message) || runtimeMs >= policy.maxRuntimeMs
    if (timedOut) {
      await logger.onTimeoutKilled?.({ userId: input.userId, sandboxId: sandbox.sandboxId, runtimeMs, limitMs: policy.maxRuntimeMs, ts: new Date().toISOString() })
    }
    throw new SandboxPolicyError(timedOut ? 'RUNTIME_LIMIT' : 'INTERNAL_ERROR', timedOut ? 'Sandbox execution timed out.' : message, timedOut ? 408 : 500)
  }
}

// TODO: Replace in-memory tracking with persistent DB-backed quota + audit tables.
export const __sandboxInternals = { usageTracker, sessionTracker, repeatTracker }
