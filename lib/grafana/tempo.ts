/**
 * Tempo trace exporter — ships OpenTelemetry-compatible spans to Grafana Tempo
 * via the OTLP HTTP endpoint.
 *
 * Supplements the existing lib/observability/tracing.ts Langfuse exporter:
 * both run in parallel; neither blocks the agent execution path.
 */

import { getConfig, getAuthHeader } from './client'
import type { Span } from '@/lib/observability/tracing'

// Minimal OTLP/HTTP protobuf-JSON representation for a span
interface OtlpSpan {
  traceId: string
  spanId: string
  parentSpanId?: string
  name: string
  kind: number           // 1 = INTERNAL, 2 = SERVER, 3 = CLIENT
  startTimeUnixNano: string
  endTimeUnixNano: string
  status: { code: number; message?: string }  // 0=UNSET,1=OK,2=ERROR
  attributes: { key: string; value: { stringValue?: string; intValue?: string } }[]
}

function toOtlpSpan(span: Span): OtlpSpan {
  const attrs = Object.entries(span.attributes).map(([key, value]) => ({
    key,
    value: typeof value === 'number'
      ? { intValue: String(value) }
      : { stringValue: String(value) },
  }))

  // Add LiftGO service attributes
  attrs.push({ key: 'service.name', value: { stringValue: 'liftgo-web' } })
  attrs.push({ key: 'service.namespace', value: { stringValue: 'liftgo' } })

  return {
    traceId: span.traceId.padEnd(32, '0'),
    spanId: span.spanId.padEnd(16, '0'),
    parentSpanId: span.parentSpanId?.padEnd(16, '0'),
    name: span.operation,
    kind: 1,
    startTimeUnixNano: (span.startTime * 1_000_000).toString(),
    endTimeUnixNano: ((span.endTime ?? span.startTime) * 1_000_000).toString(),
    status: {
      code: span.status === 'ok' ? 1 : span.status === 'error' ? 2 : 0,
      message: span.error,
    },
    attributes: attrs,
  }
}

export async function exportSpanToTempo(span: Span): Promise<void> {
  const cfg = getConfig()
  const auth = getAuthHeader(cfg)
  if (!auth) return

  const body = {
    resourceSpans: [{
      resource: {
        attributes: [
          { key: 'service.name', value: { stringValue: 'liftgo-web' } },
          { key: 'deployment.environment', value: { stringValue: process.env.NODE_ENV ?? 'production' } },
        ],
      },
      scopeSpans: [{
        scope: { name: 'liftgo/tracer', version: '1.0.0' },
        spans: [toOtlpSpan(span)],
      }],
    }],
  }

  try {
    await fetch(`${cfg.otlpEndpoint}/v1/traces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: auth,
      },
      body: JSON.stringify(body),
    })
  } catch {
    // Never propagate
  }
}
