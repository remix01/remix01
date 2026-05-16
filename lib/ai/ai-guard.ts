/**
 * AI Failure Policy Guard — LiftGO
 *
 * AI is an ENRICHMENT layer. It must never block:
 *   - Oddaja povpraševanja (lead submission)
 *   - Task creation / onboarding
 *   - Basic obrtnik matching
 *   - Payment flows
 *
 * Classification of AI calls:
 *   critical    — should never exist; AI must not be in critical path
 *   enrichment  — user-facing optional enrichment (parse-inquiry, offer hints)
 *   background  — async/cron jobs (lead scoring, summaries, quality)
 *   optional    — advisory features (insights, coaching, categorisation)
 */

import { hasAnyAI, hasAnthropicAI, hasOpenAI, hasGemini } from '@/lib/env'

// ─── Call Classification ──────────────────────────────────────────────────────

export type AICallCategory = 'critical' | 'enrichment' | 'background' | 'optional'

// Timeout budgets per category (ms). critical=0 means "never call AI".
export const AI_TIMEOUT_MS: Record<AICallCategory, number> = {
  critical: 0,
  enrichment: 7_000,
  background: 30_000,
  optional: 15_000,
}

// ─── Circuit Breaker ──────────────────────────────────────────────────────────

interface CircuitState {
  failures: number
  lastFailureAt: number
  open: boolean
}

const _circuit: CircuitState = { failures: 0, lastFailureAt: 0, open: false }

const CIRCUIT_THRESHOLD = 5   // consecutive failures before opening
const CIRCUIT_RESET_MS = 60_000  // cool-down before half-open probe

function _resetIfExpired(): void {
  if (_circuit.open && Date.now() - _circuit.lastFailureAt > CIRCUIT_RESET_MS) {
    _circuit.open = false
    _circuit.failures = 0
    console.info('[AI Guard] Circuit breaker reset (cool-down elapsed)')
  }
}

function _recordFailure(): void {
  _circuit.failures++
  _circuit.lastFailureAt = Date.now()
  if (!_circuit.open && _circuit.failures >= CIRCUIT_THRESHOLD) {
    _circuit.open = true
    console.warn(`[AI Guard] Circuit breaker OPEN after ${_circuit.failures} failures — AI calls paused for ${CIRCUIT_RESET_MS / 1000}s`)
  }
}

function _recordSuccess(): void {
  if (_circuit.failures > 0) {
    _circuit.failures = Math.max(0, _circuit.failures - 1)
  }
}

export function isCircuitOpen(): boolean {
  _resetIfExpired()
  return _circuit.open
}

// ─── Availability Check ───────────────────────────────────────────────────────

export function isAIAvailable(): boolean {
  if (!hasAnyAI()) return false
  if (isCircuitOpen()) return false
  return true
}

// ─── Core Guard: withAIFallback ───────────────────────────────────────────────

/**
 * Safely executes an AI call with:
 *   1. Circuit breaker guard (skip when open)
 *   2. Timeout budget by category
 *   3. Structured failure logging
 *   4. Guaranteed fallback — never throws
 */
export async function withAIFallback<T>(
  category: AICallCategory,
  label: string,
  aiCall: () => Promise<T>,
  fallback: T
): Promise<T> {
  if (category === 'critical') {
    console.error(`[AI Guard] BUG: AI call "${label}" classified as critical — returning fallback immediately`)
    return fallback
  }

  if (!isAIAvailable()) {
    console.warn(`[AI Guard] "${label}" (${category}) — AI unavailable, using fallback`)
    return fallback
  }

  const timeoutMs = AI_TIMEOUT_MS[category]

  try {
    const result = await Promise.race([
      aiCall(),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error(`[AI Guard] Timeout: "${label}" exceeded ${timeoutMs}ms`)),
          timeoutMs
        )
      ),
    ])
    _recordSuccess()
    return result
  } catch (err) {
    _recordFailure()
    console.error(`[AI Guard] "${label}" (${category}) failed — using fallback. Reason:`, err instanceof Error ? err.message : err)
    return fallback
  }
}

// ─── Fire-and-Forget for Background Enrichment ───────────────────────────────

/**
 * Schedules a background AI call without blocking the caller.
 * Errors are logged but never propagate. Use for post-event enrichment.
 */
export function fireAndForgetAI(label: string, call: () => Promise<void>): void {
  if (!isAIAvailable()) return
  Promise.resolve()
    .then(call)
    .catch((err) => {
      _recordFailure()
      console.error(`[AI Guard] Background "${label}" failed:`, err instanceof Error ? err.message : err)
    })
}

// ─── Health / Observability ───────────────────────────────────────────────────

export interface AIGuardStatus {
  available: boolean
  configured: boolean
  providers: {
    anthropic: boolean
    openai: boolean
    gemini: boolean
  }
  circuitBreaker: {
    open: boolean
    failures: number
    resetsInMs: number | null
  }
}

export function getAIGuardStatus(): AIGuardStatus {
  _resetIfExpired()
  const resetsInMs =
    _circuit.open ? Math.max(0, CIRCUIT_RESET_MS - (Date.now() - _circuit.lastFailureAt)) : null

  return {
    available: isAIAvailable(),
    configured: hasAnyAI(),
    providers: {
      anthropic: hasAnthropicAI(),
      openai: hasOpenAI(),
      gemini: hasGemini(),
    },
    circuitBreaker: {
      open: _circuit.open,
      failures: _circuit.failures,
      resetsInMs,
    },
  }
}
