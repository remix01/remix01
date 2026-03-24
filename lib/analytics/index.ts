/**
 * Analytics Module
 *
 * Main entry point for analytics and metrics
 */

export {
  recordMetric,
  recordAPIMetric,
  recordCacheMetric,
  recordUserEngagement,
  recordErrorMetric,
  recordSearchMetric,
  recordDatabaseMetric,
  getMetrics,
  getAPIMetricsSummary,
  getCachePerformance,
  getTopEndpoints,
} from './redis-metrics'

export type { Metric, MetricsSnapshot } from './redis-metrics'
