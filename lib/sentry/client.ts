import * as Sentry from "@sentry/nextjs";

// ============================================================================
// ERROR TRACKING & REPORTING
// ============================================================================

export function captureException(
  error: Error,
  context?: Record<string, any>,
  level: Sentry.SeverityLevel = "error"
) {
  Sentry.captureException(error, {
    level,
    contexts: {
      extra: context,
    },
  });
}

export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = "info",
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      extra: context,
    },
  });
}

// ============================================================================
// BREADCRUMBS - Track user actions & system events
// ============================================================================

export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: Sentry.SeverityLevel = "info",
  category: string = "user-action"
) {
  Sentry.addBreadcrumb({
    message,
    level,
    data,
    category,
    timestamp: Date.now() / 1000,
  });
}

export function trackApiCall(
  method: string,
  url: string,
  statusCode?: number,
  duration?: number
) {
  addBreadcrumb(`API ${method} ${url}`, {
    statusCode,
    durationMs: duration,
  }, "info", "api");
}

export function trackDatabaseQuery(
  query: string,
  duration?: number,
  rowCount?: number
) {
  addBreadcrumb(`Database Query`, {
    queryPattern: query.substring(0, 100), // Truncate for privacy
    durationMs: duration,
    rowCount,
  }, "info", "database");
}

export function trackUserAction(
  action: string,
  details?: Record<string, any>
) {
  addBreadcrumb(action, details, "info", "user-action");
}

// ============================================================================
// USER CONTEXT & IDENTIFICATION
// ============================================================================

export interface UserContext {
  id: string;
  email?: string;
  username?: string;
  role?: "narocnik" | "obrtnik" | "admin";
  subscription?: "free" | "start" | "pro";
  profileType?: "narocnik" | "obrtnik";
}

export function setUser(user: UserContext) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Set additional context for business metrics
  Sentry.setContext("user_profile", {
    role: user.role,
    subscription: user.subscription,
    profileType: user.profileType,
  });
}

export function clearUser() {
  Sentry.setUser(null);
  Sentry.setContext("user_profile", {});
}

// ============================================================================
// CUSTOM METRICS & BUSINESS EVENTS
// ============================================================================

export interface CustomMetric {
  name: string;
  value: number;
  unit?: string;
  timestamp?: number;
}

export function captureMetric(metric: CustomMetric) {
  Sentry.captureMessage(`Metric: ${metric.name} = ${metric.value}${metric.unit || ""}`, "info");

  // Also add as breadcrumb for detailed context
  addBreadcrumb(`Metric recorded: ${metric.name}`, {
    value: metric.value,
    unit: metric.unit,
  }, "info", "metric");
}

// Business event tracking for LiftGO
export function trackBusinessEvent(
  eventType: string,
  details: Record<string, any>
) {
  Sentry.captureMessage(`Business Event: ${eventType}`, "info");
  addBreadcrumb(eventType, details, "info", "business");
}

export function trackSignup(userType: "narocnik" | "obrtnik") {
  trackBusinessEvent("signup", { userType });
}

export function trackSubscriptionChange(
  fromPlan: string,
  toPlan: string,
  amount?: number
) {
  trackBusinessEvent("subscription_changed", {
    from: fromPlan,
    to: toPlan,
    amount,
  });
}

export function trackTaskCreation(
  taskId: string,
  category: string,
  budget: number
) {
  trackBusinessEvent("task_created", {
    taskId,
    category,
    budget,
  });
}

export function trackOfferSubmission(
  taskId: string,
  offerId: string,
  amount: number
) {
  trackBusinessEvent("offer_submitted", {
    taskId,
    offerId,
    amount,
  });
}

export function trackTaskCompletion(
  taskId: string,
  duration: number,
  rating?: number
) {
  trackBusinessEvent("task_completed", {
    taskId,
    durationHours: Math.round(duration / 3600),
    rating,
  });
}

export function trackPaymentProcessed(
  amount: number,
  currency: string = "EUR",
  transactionId?: string
) {
  trackBusinessEvent("payment_processed", {
    amount,
    currency,
    transactionId,
  });
}

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

export function startTransaction(
  name: string,
  op: string = "http.request"
): Sentry.Transaction | undefined {
  return Sentry.startTransaction({
    name,
    op,
    sampled: true,
  });
}

export function recordDuration(label: string, durationMs: number) {
  const severity =
    durationMs > 5000 ? "warning" :
    durationMs > 10000 ? "error" :
    "info";

  captureMessage(`Performance: ${label} took ${durationMs}ms`, severity, {
    durationMs,
  });
}

export function measureApiPerformance(
  endpoint: string,
  startTime: number,
  statusCode: number
) {
  const duration = Date.now() - startTime;
  const severity =
    statusCode >= 500 ? "error" :
    statusCode >= 400 ? "warning" :
    duration > 5000 ? "warning" :
    "info";

  captureMessage(
    `API ${endpoint}: ${statusCode} in ${duration}ms`,
    severity,
    { endpoint, statusCode, duration }
  );
}

// ============================================================================
// RELEASE & DEPLOYMENT TRACKING
// ============================================================================

export function setRelease(release: string) {
  Sentry.setTag("release", release);
  Sentry.setContext("deployment", { release });
}

export function setDeploymentContext(context: {
  region?: string;
  version?: string;
  buildId?: string;
}) {
  Sentry.setContext("deployment", context);
}

// ============================================================================
// TAGS & CONTEXT
// ============================================================================

export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

export function setContext(name: string, context: Record<string, any>) {
  Sentry.setContext(name, context);
}

export function captureWithContext(
  error: Error,
  contextName: string,
  context: Record<string, any>
) {
  Sentry.withContext(contextName, context, () => {
    captureException(error);
  });
}

// ============================================================================
// EXPORT SENTRY FOR ADVANCED USAGE
// ============================================================================

export { Sentry };

