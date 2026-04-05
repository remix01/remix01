/**
 * Sentry Monitoring - Complete Export
 * Central hub for all monitoring, alerting, and observability
 */

// Core initialization
export { initSentry } from "./init";
export { Sentry } from "./init";

// Client utilities
export {
  captureException,
  captureMessage,
  addBreadcrumb,
  trackApiCall,
  trackDatabaseQuery,
  trackUserAction,
  setUser,
  clearUser,
  captureMetric,
  trackBusinessEvent,
  trackSignup,
  trackSubscriptionChange,
  trackTaskCreation,
  trackOfferSubmission,
  trackTaskCompletion,
  trackPaymentProcessed,
  startTransaction,
  recordDuration,
  measureApiPerformance,
  setRelease,
  setDeploymentContext,
  setTag,
  setContext,
  captureWithContext,
  type UserContext,
  type CustomMetric,
} from "./client";

// Performance monitoring
export {
  startPerformanceSpan,
  endPerformanceSpan,
  wrapApiCall,
  measureDatabaseQuery,
  captureWebVitals,
  capturePageLoadMetrics,
  recordApiMetric,
  flushApiMetrics,
  captureMiddlewarePerformance,
  type TransactionSpan,
  type WebVitals,
  type ApiMetrics,
} from "./performance";

// Alerting
export {
  AlertSeverity,
  AlertChannel,
  ALERT_RULES,
  shouldAlert,
  recordAlert,
  evaluateAlerts,
  sendAlert,
  type AlertRule,
} from "./alerts";

// Release tracking
export {
  setCurrentRelease,
  recordDeployment,
  recordRollback,
  recordCommit,
  recordCommits,
  setFeatureFlag,
  isFeatureEnabled,
  recordFeatureFlagUsage,
  recordPerformanceChange,
  runDeploymentChecks,
  setVersionInfo,
  getVersionInfo,
  type ReleaseInfo,
  type DeploymentInfo,
  type CommitInfo,
  type FeatureFlag,
  type PerformanceComparison,
  type DeploymentCheck,
  type VersionInfo,
} from "./releases";

// Integrations
export {
  sendSlackNotification,
  createJiraIssue,
  updateJiraIssue,
  addJiraComment,
  createGitHubIssue,
  createGitHubRelease,
  triggerPagerDutyIncident,
  resolvePagerDutyIncident,
  type SlackConfig,
  type JiraConfig,
  type JiraIssueData,
  type GitHubConfig,
  type PagerDutyConfig,
} from "./integrations";

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Initialize Sentry with all integrations
 * Call this once at app startup
 */
export async function initializeSentryMonitoring(): Promise<void> {
  if (typeof window !== "undefined") {
    // Client-side initialization
    const { initSentry } = await import("./init");
    initSentry();
  }
}

/**
 * Get current monitoring status
 */
export function getMonitoringStatus(): {
  initialized: boolean;
  environment: string | undefined;
  release: string | undefined;
} {
  return {
    initialized: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,
  };
}
