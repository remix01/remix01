/**
 * Loki log shipper — pushes structured log lines to Grafana Loki via HTTP.
 *
 * LiftGO label taxonomy:
 *   app=liftgo, env={production|development}, level={info|warn|error|debug},
 *   service={api|agent|auth|payments|queue|realtime}
 *
 * Never throws — all failures are swallowed so logging can't break request paths.
 */

import { getConfig, getAuthHeader } from './client'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

type LiftGoService =
  | 'api'
  | 'agent'
  | 'auth'
  | 'payments'
  | 'queue'
  | 'realtime'
  | 'cron'
  | 'webhook'

interface LogEntry {
  level: LogLevel
  service: LiftGoService
  message: string
  fields?: Record<string, string | number | boolean>
}

interface LokiStream {
  stream: Record<string, string>
  values: [string, string][]  // [nanoseconds, line]
}

interface LokiPushBody {
  streams: LokiStream[]
}

function nowNano(): string {
  return (Date.now() * 1_000_000).toString()
}

function buildLogLine(entry: LogEntry): string {
  const base: Record<string, unknown> = {
    msg: entry.message,
    level: entry.level,
    service: entry.service,
    app: 'liftgo',
    ts: new Date().toISOString(),
  }
  if (entry.fields) Object.assign(base, entry.fields)
  return JSON.stringify(base)
}

async function push(entries: LogEntry[]): Promise<void> {
  const cfg = getConfig()
  const auth = getAuthHeader(cfg)
  if (!auth) return  // Grafana not configured — silent no-op

  const env = process.env.NODE_ENV === 'production' ? 'production' : 'development'

  // Group by service so each gets its own Loki stream
  const streamMap = new Map<string, LokiStream>()

  for (const entry of entries) {
    const key = `${entry.service}:${entry.level}`
    if (!streamMap.has(key)) {
      streamMap.set(key, {
        stream: {
          app: 'liftgo',
          env,
          service: entry.service,
          level: entry.level,
        },
        values: [],
      })
    }
    streamMap.get(key)!.values.push([nowNano(), buildLogLine(entry)])
  }

  const body: LokiPushBody = { streams: [...streamMap.values()] }

  try {
    await fetch(`${cfg.lokiUrl}/loki/api/v1/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
    })
  } catch {
    // Never propagate — logging must never break the caller
  }
}

export const lokiLogger = {
  info(service: LiftGoService, message: string, fields?: LogEntry['fields']) {
    void push([{ level: 'info', service, message, fields }])
  },
  warn(service: LiftGoService, message: string, fields?: LogEntry['fields']) {
    void push([{ level: 'warn', service, message, fields }])
  },
  error(service: LiftGoService, message: string, fields?: LogEntry['fields']) {
    void push([{ level: 'error', service, message, fields }])
  },
  debug(service: LiftGoService, message: string, fields?: LogEntry['fields']) {
    if (process.env.NODE_ENV === 'production') return
    void push([{ level: 'debug', service, message, fields }])
  },
  /** Batch push — use for bulk log shipping (e.g. from cron jobs). */
  batch(entries: LogEntry[]) {
    void push(entries)
  },
}
