/**
 * Performance Monitoring for LiftGO
 * Tracks transactions, response times, database queries, and Web Vitals
 */

import * as Sentry from "@sentry/nextjs";
import { captureMessage, addBreadcrumb, recordDuration } from "./client";

// ============================================================================
// TRANSACTION TRACKING
// ============================================================================

export interface TransactionSpan {
  startTime: number;
  operation: string;
  description: string;
}

const activeTransactions = new Map<string, TransactionSpan>();

export function startPerformanceSpan(
  id: string,
  operation: string,
  description: string
): void {
  activeTransactions.set(id, {
    startTime: Date.now(),
    operation,
    description,
  });
}

export function endPerformanceSpan(id: string): number | undefined {
  const span = activeTransactions.get(id);
  if (!span) return undefined;

  const duration = Date.now() - span.startTime;
  activeTransactions.delete(id);

  recordDuration(`${span.operation}: ${span.description}`, duration);
  return duration;
}

// ============================================================================
// API PERFORMANCE MONITORING
// ============================================================================

export function wrapApiCall<T>(
  endpoint: string,
  fn: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const spanId = `api-${endpoint}-${Date.now()}`;

  startPerformanceSpan(spanId, "http.request", endpoint);

  return fn()
    .then((result) => {
      const duration = endPerformanceSpan(spanId);
      addBreadcrumb(`API ${endpoint}`, { duration, statusCode: 200 }, "info", "api");
      return result;
    })
    .catch((error) => {
      const duration = endPerformanceSpan(spanId);
      addBreadcrumb(
        `API ${endpoint} failed`,
        { duration, error: error.message },
        "error",
        "api"
      );
      throw error;
    });
}

// ============================================================================
// DATABASE QUERY MONITORING
// ============================================================================

export function measureDatabaseQuery(
  queryId: string,
  duration: number,
  rowCount?: number,
  queryType: "select" | "insert" | "update" | "delete" = "select"
): void {
  const severity =
    duration > 5000 ? "warning" :
    duration > 10000 ? "error" :
    "info";

  addBreadcrumb(
    `Database ${queryType} - ${duration}ms`,
    { rowCount, queryId },
    severity,
    "database"
  );

  // Track as metric
  Sentry.captureMessage(
    `DB Query (${queryType}): ${duration}ms, rows: ${rowCount || 0}`,
    severity === "error" ? "error" : severity === "warning" ? "warning" : "info"
  );
}

// ============================================================================
// WEB VITALS MONITORING
// ============================================================================

export interface WebVitals {
  cls?: number; // Cumulative Layout Shift
  fid?: number; // First Input Delay
  fcp?: number; // First Contentful Paint
  lcp?: number; // Largest Contentful Paint
  ttfb?: number; // Time to First Byte
}

export function captureWebVitals(vitals: WebVitals): void {
  const warnings: string[] = [];

  // CLS: Should be < 0.1
  if (vitals.cls !== undefined) {
    if (vitals.cls > 0.1) {
      warnings.push(
        `CLS (${vitals.cls.toFixed(3)}) exceeds threshold (0.1)`
      );
    }
    Sentry.captureMessage(`CLS: ${vitals.cls.toFixed(3)}`, "info");
  }

  // FCP: Should be < 1.8s
  if (vitals.fcp !== undefined) {
    if (vitals.fcp > 1800) {
      warnings.push(`FCP (${vitals.fcp}ms) exceeds threshold (1800ms)`);
    }
    Sentry.captureMessage(`FCP: ${vitals.fcp}ms`, "info");
  }

  // LCP: Should be < 2.5s
  if (vitals.lcp !== undefined) {
    if (vitals.lcp > 2500) {
      warnings.push(`LCP (${vitals.lcp}ms) exceeds threshold (2500ms)`);
    }
    Sentry.captureMessage(`LCP: ${vitals.lcp}ms`, "info");
  }

  // TTFB: Should be < 600ms
  if (vitals.ttfb !== undefined) {
    if (vitals.ttfb > 600) {
      warnings.push(`TTFB (${vitals.ttfb}ms) exceeds threshold (600ms)`);
    }
    Sentry.captureMessage(`TTFB: ${vitals.ttfb}ms`, "info");
  }

  // Report warnings
  if (warnings.length > 0) {
    addBreadcrumb(
      "Web Vitals Warnings",
      { warnings },
      "warning",
      "performance"
    );
  }
}

// ============================================================================
// CUSTOM PERFORMANCE METRICS
// ============================================================================

export function capturePageLoadMetrics(): void {
  if (typeof window === "undefined") return;

  const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  if (!navigation) return;

  const metrics = {
    navigationStart: navigation.fetchStart,
    responseEnd: navigation.responseEnd,
    domInteractive: navigation.domInteractive,
    domContentLoaded: navigation.domContentLoaded,
    loadComplete: navigation.loadEventEnd,
  };

  const durations = {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    ttfb: navigation.responseStart - navigation.requestStart,
    download: navigation.responseEnd - navigation.responseStart,
    domInteractive: navigation.domInteractive - navigation.responseEnd,
    domLoading: navigation.loadEventEnd - navigation.domContentLoaded,
  };

  addBreadcrumb(
    "Page Load Metrics",
    {
      metrics,
      durations,
      totalTime: navigation.loadEventEnd - navigation.fetchStart,
    },
    "info",
    "performance"
  );
}

// ============================================================================
// API ENDPOINT MONITORING
// ============================================================================

export interface ApiMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  timestamp: number;
}

const apiMetricsBuffer: ApiMetrics[] = [];

export function recordApiMetric(metric: ApiMetrics): void {
  apiMetricsBuffer.push(metric);

  // Alert on slow endpoints
  if (metric.duration > 5000) {
    addBreadcrumb(
      `Slow API: ${metric.method} ${metric.endpoint}`,
      { duration: metric.duration, statusCode: metric.statusCode },
      "warning",
      "api"
    );
  }

  // Alert on errors
  if (metric.statusCode >= 400) {
    addBreadcrumb(
      `API Error: ${metric.method} ${metric.endpoint}`,
      { statusCode: metric.statusCode, duration: metric.duration },
      "error",
      "api"
    );
  }

  // Flush metrics periodically
  if (apiMetricsBuffer.length >= 10) {
    flushApiMetrics();
  }
}

export function flushApiMetrics(): void {
  if (apiMetricsBuffer.length === 0) return;

  const avgDuration =
    apiMetricsBuffer.reduce((sum, m) => sum + m.duration, 0) /
    apiMetricsBuffer.length;
  const errorCount = apiMetricsBuffer.filter(
    (m) => m.statusCode >= 400
  ).length;

  addBreadcrumb(
    "API Metrics Summary",
    {
      totalRequests: apiMetricsBuffer.length,
      avgDuration: Math.round(avgDuration),
      errorCount,
    },
    "info",
    "api"
  );

  apiMetricsBuffer.length = 0;
}

// ============================================================================
// MIDDLEWARE PERFORMANCE
// ============================================================================

export function captureMiddlewarePerformance(
  name: string,
  duration: number
): void {
  if (duration > 1000) {
    addBreadcrumb(
      `Slow Middleware: ${name}`,
      { duration },
      "warning",
      "middleware"
    );
  }
}

export { Sentry };
