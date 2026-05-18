/**
 * Grafana Cloud connection config for remix01.grafana.net
 *
 * Signals → endpoints:
 *   Logs   → Loki  (GRAFANA_LOKI_URL)
 *   Traces → Tempo via OTLP HTTP (GRAFANA_OTLP_ENDPOINT)
 *   Metrics→ Mimir remote-write (GRAFANA_PROMETHEUS_URL) or /api/metrics scrape
 *
 * Auth for all endpoints: Basic base64(GRAFANA_INSTANCE_ID:GRAFANA_API_TOKEN)
 */

export interface GrafanaConfig {
  instanceId: string
  apiToken: string
  otlpEndpoint: string     // https://otlp-gateway-{region}.grafana.net/otlp
  lokiUrl: string          // https://logs-prod-{region}.grafana.net
  prometheusUrl: string    // https://prometheus-prod-{id}-prod-{region}.grafana.net
  stackName: string        // remix01
}

function getConfig(): GrafanaConfig {
  return {
    instanceId:     process.env.GRAFANA_INSTANCE_ID ?? '',
    apiToken:       process.env.GRAFANA_API_TOKEN ?? '',
    otlpEndpoint:   process.env.GRAFANA_OTLP_ENDPOINT ?? 'https://otlp-gateway-prod-eu-west-0.grafana.net/otlp',
    lokiUrl:        process.env.GRAFANA_LOKI_URL ?? 'https://logs-prod-eu-west-0.grafana.net',
    prometheusUrl:  process.env.GRAFANA_PROMETHEUS_URL ?? 'https://prometheus-prod-13-prod-eu-west-0.grafana.net',
    stackName:      process.env.GRAFANA_STACK_NAME ?? 'remix01',
  }
}

export function getAuthHeader(cfg: GrafanaConfig): string {
  if (!cfg.instanceId || !cfg.apiToken) return ''
  const creds = Buffer.from(`${cfg.instanceId}:${cfg.apiToken}`).toString('base64')
  return `Basic ${creds}`
}

export function isConfigured(): boolean {
  const cfg = getConfig()
  return !!(cfg.instanceId && cfg.apiToken)
}

export { getConfig }
