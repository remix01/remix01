/**
 * Skill: Pametna klasifikacija napak (Error Classifier)
 *
 * Pipeline: Sentry webhook → AI triage → Supabase issue log → Telegram alert
 *
 * Receives a raw Sentry event, asks Claude to:
 *   1. Classify severity (P0-P3)
 *   2. Assign component owner (payments | auth | agents | ui | infra)
 *   3. Estimate user impact
 *   4. Suggest first-response action
 *
 * Stores result in `error_classifications` table and fires
 * a Telegram alert for P0/P1 issues.
 *
 * Env:
 *   ANTHROPIC_API_KEY  — Claude API key
 *   SENTRY_WEBHOOK_SECRET — Sentry webhook signing key
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { alertAdmin } from '@/lib/connectors/telegram'

export type Priority = 'P0' | 'P1' | 'P2' | 'P3'
export type Component = 'payments' | 'auth' | 'agents' | 'ui' | 'infra' | 'unknown'

export interface SentryEvent {
  id: string
  title: string
  culprit?: string
  level: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
  platform?: string
  tags?: Record<string, string>
  exception?: {
    values?: Array<{
      type?: string
      value?: string
      stacktrace?: { frames?: Array<{ filename?: string; function?: string }> }
    }>
  }
  request?: {
    url?: string
    method?: string
  }
  user?: {
    id?: string
    email?: string
  }
  timestamp?: number
}

export interface ClassificationResult {
  sentryId: string
  priority: Priority
  component: Component
  impactDescription: string
  suggestedAction: string
  reasoning: string
  autoAlerted: boolean
}

// ── Claude prompt ────────────────────────────────────────────────────────────

function buildPrompt(evt: SentryEvent): string {
  const frames = evt.exception?.values?.[0]?.stacktrace?.frames ?? []
  const topFrames = frames
    .slice(-5)
    .map((f) => `  ${f.filename ?? '?'}:${f.function ?? '?'}`)
    .join('\n')

  return `You are a senior engineer triaging a production error for LiftGO, a Slovenian marketplace connecting customers with craftsmen.

## Error Event
Title: ${evt.title}
Level: ${evt.level}
Culprit: ${evt.culprit ?? 'unknown'}
URL: ${evt.request?.url ?? 'N/A'} [${evt.request?.method ?? ''}]
Exception type: ${evt.exception?.values?.[0]?.type ?? 'N/A'}
Exception message: ${evt.exception?.values?.[0]?.value ?? 'N/A'}

Top stack frames:
${topFrames || '  (no frames)'}

Tags: ${JSON.stringify(evt.tags ?? {})}
Affected user: ${evt.user?.email ?? 'unknown'}

## LiftGO Components
- payments: Stripe escrow, subscriptions, webhooks
- auth: Supabase Auth, middleware, sessions
- agents: AI agents (7 types), MessageBus, QStash jobs
- ui: React components, hero, forms
- infra: Vercel, Redis, Upstash, database connections
- unknown: anything else

## Task
Respond with ONLY valid JSON matching this schema:
{
  "priority": "P0" | "P1" | "P2" | "P3",
  "component": "payments" | "auth" | "agents" | "ui" | "infra" | "unknown",
  "impactDescription": "one sentence describing who/what is affected",
  "suggestedAction": "one concrete first-response action",
  "reasoning": "2-3 sentences explaining your classification"
}

Priority guide:
- P0: Production down, payments failing, data loss. Immediate fix needed.
- P1: Critical feature broken for subset of users, workaround possible.
- P2: Non-critical degradation, affects UX but not core flows.
- P3: Minor issue, cosmetic, or low-frequency.`
}

// ── Main classifier ──────────────────────────────────────────────────────────

export async function classifyError(
  evt: SentryEvent
): Promise<ClassificationResult> {
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001', // Fast + cheap for triage
    max_tokens: 512,
    messages: [{ role: 'user', content: buildPrompt(evt) }],
  })

  const rawText =
    message.content[0].type === 'text' ? message.content[0].text : ''

  // Parse JSON — Claude may wrap in ```json blocks
  let parsed: Omit<ClassificationResult, 'sentryId' | 'autoAlerted'>
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    // Fallback classification if Claude returns unexpected format
    parsed = {
      priority: 'P2',
      component: 'unknown',
      impactDescription: 'Unable to classify automatically',
      suggestedAction: 'Manual investigation required',
      reasoning: rawText.slice(0, 200),
    }
  }

  const result: ClassificationResult = {
    sentryId: evt.id,
    autoAlerted: false,
    ...parsed,
  }

  // Persist to Supabase
  await supabaseAdmin.from('error_classifications').upsert({
    sentry_id: evt.id,
    title: evt.title,
    level: evt.level,
    priority: result.priority,
    component: result.component,
    impact_description: result.impactDescription,
    suggested_action: result.suggestedAction,
    reasoning: result.reasoning,
    raw_event: evt,
    classified_at: new Date().toISOString(),
  }, { onConflict: 'sentry_id' })

  // Fire Telegram alert for critical issues
  if (result.priority === 'P0' || result.priority === 'P1') {
    await alertAdmin(
      `[${result.priority}] ${evt.title}`,
      `Komponenta: <b>${result.component}</b>\nVpliv: ${result.impactDescription}\nAkcija: ${result.suggestedAction}`,
      result.priority === 'P0' ? 'critical' : 'warning'
    )
    result.autoAlerted = true
  }

  return result
}
