import 'server-only'

import crypto from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/server'
import type { Json } from '@/types/supabase'

export type SandboxSessionStatus = 'active' | 'expired' | 'terminated' | 'blocked'
export type SandboxAbuseEventType = 'repeated_abuse_attempt' | 'dangerous_command_blocked' | 'quota_violation' | 'excessive_concurrency' | 'disabled_feature_access'

const toHash = (value: string | null | undefined): string | null => {
  if (!value) return null
  return crypto.createHash('sha256').update(value).digest('hex')
}

export async function logSandboxSessionStarted(event: { userId: string; sandboxId: string; template: string; language: string; tier: string; expiresAt?: string }) {
  const supabase = createAdminClient()
  await supabase.from('sandbox_sessions').upsert({ user_id: event.userId, sandbox_id: event.sandboxId, template: event.template, language: event.language, tier: event.tier, status: 'active', expires_at: event.expiresAt ?? null }, { onConflict: 'sandbox_id' })
}

export async function logSandboxExecutionFinished(event: { userId: string; sandboxId: string; executionId: string; runtimeMs: number; stdoutSize: number; stderrSize: number; exitCode: number | null; blockedReason?: string | null; timedOut: boolean; estimatedCostUsd?: number | null; prompt?: string; code?: string; status?: string }) {
  const supabase = createAdminClient()
  const { data: session } = await supabase.from('sandbox_sessions').select('id').eq('sandbox_id', event.sandboxId).maybeSingle()
  if (!session?.id) return
  await supabase.from('sandbox_executions').insert({
    session_id: session.id,
    execution_id: event.executionId,
    sandbox_id: event.sandboxId,
    user_id: event.userId,
    status: event.status ?? (event.timedOut ? 'timed_out' : 'completed'),
    runtime_ms: event.runtimeMs,
    stdout_size: event.stdoutSize,
    stderr_size: event.stderrSize,
    exit_code: event.exitCode,
    blocked_reason: event.blockedReason ?? null,
    timed_out: event.timedOut,
    estimated_cost_usd: event.estimatedCostUsd ?? null,
    prompt_hash: toHash(event.prompt),
    code_hash: toHash(event.code),
  })

  const { error: rpcError } = await supabase.rpc('increment_sandbox_session_usage' as any, { p_sandbox_id: event.sandboxId, p_runtime_ms: event.runtimeMs })
  if (rpcError) {
    const { data } = await supabase.from('sandbox_sessions').select('runtime_total_ms, execution_count').eq('sandbox_id', event.sandboxId).single()
    await supabase.from('sandbox_sessions').update({ runtime_total_ms: (data?.runtime_total_ms ?? 0) + event.runtimeMs, execution_count: (data?.execution_count ?? 0) + 1 }).eq('sandbox_id', event.sandboxId)
  }
}

export async function logSandboxBlocked(event: { userId: string; sandboxId?: string; reason: string; details?: Record<string, unknown> }) {
  return logAbuseEvent({ userId: event.userId, sandboxId: event.sandboxId, reason: event.reason, eventType: event.reason === 'DANGEROUS_PATTERN' ? 'dangerous_command_blocked' : 'excessive_concurrency', details: event.details })
}

export async function logSandboxQuotaExceeded(event: { userId: string; sandboxId?: string; reason: string; details?: Record<string, unknown> }) {
  return logAbuseEvent({ userId: event.userId, sandboxId: event.sandboxId, reason: event.reason, eventType: 'quota_violation', details: event.details })
}

export async function logAbuseEvent(event: { userId: string; sessionId?: string; sandboxId?: string; eventType: SandboxAbuseEventType; reason?: string; details?: Record<string, unknown> }) {
  const supabase = createAdminClient()
  await supabase.from('sandbox_abuse_events').insert({ user_id: event.userId, session_id: event.sessionId ?? null, sandbox_id: event.sandboxId ?? null, event_type: event.eventType, reason: event.reason ?? null, details: (event.details ?? {}) as Json })
}

export async function getDailySandboxUsage(userId: string) {
  const supabase = createAdminClient()
  const start = new Date(); start.setUTCHours(0,0,0,0)
  const { data } = await supabase.from('sandbox_executions').select('runtime_ms, estimated_cost_usd').eq('user_id', userId).gte('created_at', start.toISOString())
  return { executions: data?.length ?? 0, runtimeMs: (data ?? []).reduce((a, r: any) => a + (r.runtime_ms ?? 0), 0), estimatedCostUsd: (data ?? []).reduce((a, r: any) => a + Number(r.estimated_cost_usd ?? 0), 0) }
}

export async function getConcurrentSandboxCount(userId: string) {
  const supabase = createAdminClient()
  const { count } = await supabase.from('sandbox_sessions').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active')
  return count ?? 0
}

export async function getSandboxUsageByTier(userId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase.from('sandbox_sessions').select('tier, execution_count, runtime_total_ms').eq('user_id', userId)
  const grouped: Record<string, { executions: number; runtimeMs: number }> = {}
  for (const row of data ?? []) {
    grouped[row.tier] = grouped[row.tier] ?? { executions: 0, runtimeMs: 0 }
    grouped[row.tier].executions += Number((row as any).execution_count ?? 0)
    grouped[row.tier].runtimeMs += Number((row as any).runtime_total_ms ?? 0)
  }
  return grouped
}

export async function getSandboxAdminMonitoring() {
  const supabase = createAdminClient()
  const [{ data: active }, { data: spend }, { data: abuse }, { data: timeouts }, { data: topUsers }] = await Promise.all([
    supabase.from('sandbox_sessions').select('id').eq('status', 'active'),
    supabase.from('sandbox_executions').select('estimated_cost_usd'),
    supabase.from('sandbox_abuse_events').select('event_type'),
    supabase.from('sandbox_executions').select('timed_out').eq('timed_out', true),
    supabase.from('sandbox_sessions').select('user_id, execution_count').order('execution_count', { ascending: false }).limit(10),
  ])
  return {
    activeSandboxCount: active?.length ?? 0,
    estimatedSpendUsd: (spend ?? []).reduce((a: number, r: any) => a + Number(r.estimated_cost_usd ?? 0), 0),
    abuseEventCounts: (abuse ?? []).reduce((acc: Record<string, number>, row: any) => ({ ...acc, [row.event_type]: (acc[row.event_type] ?? 0) + 1 }), {}),
    timeoutFrequency: { timeouts: timeouts?.length ?? 0, totalExecutions: spend?.length ?? 0 },
    topSandboxUsers: topUsers ?? [],
  }
}

export async function cleanupSandboxData(nowIso = new Date().toISOString()) {
  const supabase = createAdminClient()
  await supabase.from('sandbox_sessions').update({ status: 'expired' }).lt('expires_at', nowIso).eq('status', 'active')
  await supabase.from('sandbox_sessions').update({ status: 'terminated', ended_at: nowIso }).lt('started_at', new Date(Date.now() - (6 * 60 * 60 * 1000)).toISOString()).eq('status', 'active')
  await supabase.from('sandbox_executions').delete().is('session_id', null)
}
