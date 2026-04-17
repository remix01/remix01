/**
 * Connector Registry — LiftGO
 *
 * Central registry for all external service connectors.
 * Each connector follows the same interface so skills & agents
 * can swap providers without touching business logic.
 *
 * Registered connectors:
 *   telegram     → Telegram Bot API (push notifications)
 *   whatsapp     → WhatsApp Business Cloud API (customer alerts)
 *   posthog      → PostHog product analytics
 *   http         → Generic outbound HTTP requests
 */

export type ConnectorName = 'telegram' | 'whatsapp' | 'posthog' | 'http'

export interface ConnectorHealth {
  name: ConnectorName
  healthy: boolean
  latencyMs?: number
  error?: string
}

/** Minimum interface every connector must implement */
export interface Connector {
  name: ConnectorName
  isConfigured(): boolean
  healthCheck(): Promise<ConnectorHealth>
}

// ── Lazy imports so unused connectors don't bloat cold-start bundle ──────────

let _telegram: typeof import('./telegram') | null = null
let _whatsapp: typeof import('./whatsapp') | null = null
let _posthog: typeof import('./posthog') | null = null
let _http: typeof import('./http-request') | null = null

export async function getTelegram() {
  if (!_telegram) _telegram = await import('./telegram')
  return _telegram
}

export async function getWhatsApp() {
  if (!_whatsapp) _whatsapp = await import('./whatsapp')
  return _whatsapp
}

export async function getPostHog() {
  if (!_posthog) _posthog = await import('./posthog')
  return _posthog
}

export async function getHttp() {
  if (!_http) _http = await import('./http-request')
  return _http
}

/** Run a health check on all configured connectors */
export async function checkAllConnectors(): Promise<ConnectorHealth[]> {
  const results: ConnectorHealth[] = []

  const { telegramConnector } = await getTelegram()
  if (telegramConnector.isConfigured()) {
    results.push(await telegramConnector.healthCheck())
  }

  const { whatsAppConnector } = await getWhatsApp()
  if (whatsAppConnector.isConfigured()) {
    results.push(await whatsAppConnector.healthCheck())
  }

  const { postHogConnector } = await getPostHog()
  if (postHogConnector.isConfigured()) {
    results.push(await postHogConnector.healthCheck())
  }

  return results
}
