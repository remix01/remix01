# Sentry Enterprise Monitoring Setup - LiftGO Production

Complete monitoring infrastructure for LiftGO with performance tracking, error handling, alerting, and integrations.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Configuration](#configuration)
4. [Performance Monitoring](#performance-monitoring)
5. [Error Tracking](#error-tracking)
6. [Custom Metrics](#custom-metrics)
7. [Alerting Rules](#alerting-rules)
8. [Integrations](#integrations)
9. [Release Tracking](#release-tracking)
10. [Debugging & Testing](#debugging--testing)

---

## Quick Start

### 1. Environment Variables

Add to `.env.local`:

```env
# Sentry Core
SENTRY_DSN=https://[key]@[organization].ingest.sentry.io/[project]
NEXT_PUBLIC_SENTRY_DSN=https://[key]@[organization].ingest.sentry.io/[project]

# Integrations
SLACK_WEBHOOK_CRITICAL=https://hooks.slack.com/services/...
SLACK_WEBHOOK_ENGINEERING=https://hooks.slack.com/services/...
SLACK_WEBHOOK_BUSINESS=https://hooks.slack.com/services/...
EMAIL_ONCALL=oncall@liftgo.dev
EMAIL_TEAM=team@liftgo.dev

# Jira Integration
JIRA_API_URL=https://liftgo.atlassian.net/rest/api/3
JIRA_API_TOKEN=your-api-token
JIRA_PROJECT_KEY=LIFTGO
JIRA_USERNAME=your-email@liftgo.dev

# GitHub Integration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxx
GITHUB_OWNER=remix01
GITHUB_REPO=remix01

# PagerDuty Integration
PAGERDUTY_INTEGRATION_KEY=pagerduty-key
PAGERDUTY_API_KEY=your-api-key
```

### 2. Initialize in Your App

**In `app/layout.tsx` or `app.tsx`:**

```tsx
import { initSentry } from "@/lib/sentry";

// Initialize Sentry
if (typeof window !== "undefined") {
  initSentry();
}

export default function App() {
  // ... your app
}
```

### 3. Wrap Error Boundary

```tsx
import { SentryErrorBoundary } from "@/components/sentry-error-boundary";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <SentryErrorBoundary>
          {children}
        </SentryErrorBoundary>
      </body>
    </html>
  );
}
```

---

## Architecture

### 8-Module Monitoring System

```
┌─────────────────────────────────────────────┐
│      Sentry Enterprise Dashboard            │
├─────────────────────────────────────────────┤
│ 1. Performance Monitoring  (Web Vitals)    │
│ 2. Error Tracking         (Breadcrumbs)    │
│ 3. Custom Metrics         (Business Events)│
│ 4. Release Tracking       (Deployments)    │
│ 5. Intelligent Alerting   (Smart Rules)    │
│ 6. Session Replay         (User Sessions)  │
│ 7. Integrations           (Slack, Jira)    │
│ 8. Advanced Features      (Source Maps)    │
└─────────────────────────────────────────────┘
```

### Core Files

```
lib/sentry/
├── index.ts                    # Central export hub
├── init.ts                     # Client initialization
├── client.ts                   # Error & event capture
├── performance.ts              # Transaction tracing, Web Vitals
├── alerts.ts                   # Alert rules & routing
├── releases.ts                 # Release & deployment tracking
└── integrations.ts             # External service integrations
```

---

## Configuration

### Server Configuration (`sentry.server.config.ts`)

- **Tracing**: 20% sampling in production, 100% in development
- **Error Filtering**: Filters out Next.js redirects
- **PII Protection**: Safe user identification
- **Breadcrumbs**: Max 50 per event

### Client Configuration (`lib/sentry/init.ts`)

- **Session Replay**: 10% sampling, 100% on errors
- **Web Vitals**: Automatic monitoring
- **Browser Tracing**: Full request tracing
- **PII Masking**: All text & inputs masked

### Environment-Specific

```
Development:
  - Trace sampling: 100%
  - Debug mode: Enabled
  - Session replay: 50%

Production:
  - Trace sampling: 20%
  - Debug mode: Disabled
  - Session replay: 10%
  - Smart error filtering: Enabled
```

---

## Performance Monitoring

### 1. Web Vitals Tracking

Automatically monitors Core Web Vitals:

- **LCP** (Largest Contentful Paint): Target < 2.5s
- **FID** (First Input Delay): Target < 100ms
- **CLS** (Cumulative Layout Shift): Target < 0.1
- **FCP** (First Contentful Paint): Target < 1.8s
- **TTFB** (Time to First Byte): Target < 600ms

**Usage:**

```typescript
import { capturePageLoadMetrics } from "@/lib/sentry/performance";

// Capture page load metrics
capturePageLoadMetrics();
```

### 2. Transaction Tracing

Trace requests from frontend → API → database:

```typescript
import { startPerformanceSpan, endPerformanceSpan } from "@/lib/sentry/performance";

// Start span
startPerformanceSpan("db-query-1", "database", "fetch users");
// ... do work
const duration = endPerformanceSpan("db-query-1");
```

### 3. API Performance

Automatically track API response times:

```typescript
import { recordApiMetric } from "@/lib/sentry/performance";

recordApiMetric({
  endpoint: "/api/tasks",
  method: "POST",
  statusCode: 200,
  duration: 245,
  timestamp: Date.now(),
});
```

### 4. Database Query Monitoring

```typescript
import { measureDatabaseQuery } from "@/lib/sentry/performance";

const startTime = Date.now();
const result = await db.query("SELECT ...");
const duration = Date.now() - startTime;

measureDatabaseQuery("query-1", duration, result.length, "select");
```

---

## Error Tracking

### 1. Capture Exceptions

```typescript
import { captureException } from "@/lib/sentry";

try {
  // risky operation
} catch (error) {
  captureException(error as Error, {
    feature: "task-creation",
    userId: user.id,
  });
}
```

### 2. Breadcrumbs - Track User Actions

```typescript
import { addBreadcrumb, trackUserAction } from "@/lib/sentry";

// Low-level
addBreadcrumb("User clicked button", { buttonId: "submit" });

// High-level
trackUserAction("submitted-task-form", {
  taskId: "123",
  category: "cleaning",
});
```

### 3. API Call Tracking

```typescript
import { trackApiCall } from "@/lib/sentry";

trackApiCall("GET", "/api/tasks", 200, 234);
// or
trackApiCall("POST", "/api/offers", 500, 5000); // Will generate warning
```

### 4. Database Query Tracking

```typescript
import { trackDatabaseQuery } from "@/lib/sentry";

trackDatabaseQuery("SELECT FROM tasks WHERE...", 125, 5);
```

---

## Custom Metrics

### Business Event Tracking

Track important business metrics:

```typescript
import {
  trackSignup,
  trackSubscriptionChange,
  trackTaskCreation,
  trackOfferSubmission,
  trackTaskCompletion,
  trackPaymentProcessed,
} from "@/lib/sentry";

// Signup
trackSignup("obrtnik");

// Subscription change
trackSubscriptionChange("free", "pro", 29.00);

// Task created
trackTaskCreation("task-123", "cleaning", 150.00);

// Offer submitted
trackOfferSubmission("task-123", "offer-456", 100.00);

// Task completed
trackTaskCompletion("task-123", 3600, 4.5); // 1 hour, 4.5 rating

// Payment processed
trackPaymentProcessed(100.00, "EUR", "ch_123456");
```

### Custom Metrics

```typescript
import { captureMetric } from "@/lib/sentry";

captureMetric({
  name: "user-conversion-rate",
  value: 3.5,
  unit: "%",
});

captureMetric({
  name: "api-cache-hit-ratio",
  value: 87.2,
  unit: "%",
});
```

---

## Alerting Rules

### Built-in Alert Rules

| Rule ID | Trigger | Severity | Channels |
|---------|---------|----------|----------|
| `high-error-rate` | Error rate > 5% | 🔴 Critical | Slack (critical), Email, PagerDuty |
| `db-connection-error` | Database down | 🔴 Critical | Slack, Email, Jira |
| `payment-processing-error` | Stripe error | 🔴 Critical | Slack, Email, PagerDuty, Jira |
| `auth-failure` | Auth errors | 🟠 High | Slack, Email |
| `slow-api-endpoint` | API > 5s | 🟠 High | Slack |
| `performance-degradation` | Perf issues | 🟡 Medium | Slack |
| `unhandled-rejection` | Promise rejection | 🟡 Medium | Slack |
| `deprecation-warning` | Old API usage | 🟢 Low | Slack |

### Alert Cooldowns

Prevents spam - each rule has a cooldown period:

- Critical: 10-15 minutes
- High: 15-20 minutes
- Medium: 30 minutes
- Low: 60 minutes

### Custom Alerts

Add custom alert rules:

```typescript
import { ALERT_RULES } from "@/lib/sentry/alerts";

ALERT_RULES.push({
  id: "custom-rule",
  name: "My Custom Alert",
  description: "Trigger when custom condition met",
  condition: (event) => event.level === "error",
  severity: AlertSeverity.CRITICAL,
  channels: [AlertChannel.SLACK_CRITICAL],
  cooldownMinutes: 15,
  autoResolve: true,
});
```

---

## Integrations

### 1. Slack Integration

**Setup:**

1. Create incoming webhooks in Slack
2. Add webhook URLs to environment variables
3. Use the integration:

```typescript
import { sendSlackNotification } from "@/lib/sentry/integrations";

await sendSlackNotification(
  {
    webhookUrl: process.env.SLACK_WEBHOOK_ENGINEERING,
    channel: "#engineering-alerts",
    username: "LiftGO Sentry",
    iconEmoji: ":warning:",
  },
  "Database Connection Error",
  "Failed to connect to PostgreSQL",
  {
    error: "ECONNREFUSED",
    endpoint: "db.supabase.co",
  },
  "danger"
);
```

### 2. Jira Integration

**Setup:**

1. Create API token in Jira
2. Add credentials to environment variables
3. Create issues from Sentry:

```typescript
import { createJiraIssue, addJiraComment } from "@/lib/sentry/integrations";

const issueKey = await createJiraIssue(
  {
    baseUrl: process.env.JIRA_API_URL,
    apiToken: process.env.JIRA_API_TOKEN,
    projectKey: "LIFTGO",
    username: process.env.JIRA_USERNAME,
  },
  {
    summary: "High error rate detected",
    description: "Error rate exceeded 5% threshold",
    issueType: "Bug",
    priority: "Critical",
    labels: ["sentry-alert", "production"],
  }
);

// Add comment
await addJiraComment(
  config,
  issueKey,
  "Status updated: Error rate normalized"
);
```

### 3. GitHub Integration

**Setup:**

1. Create personal access token
2. Add to environment variables
3. Create releases:

```typescript
import { createGitHubRelease } from "@/lib/sentry/integrations";

await createGitHubRelease(
  {
    token: process.env.GITHUB_TOKEN,
    owner: "remix01",
    repo: "remix01",
  },
  "v1.2.3",
  "Production Release 1.2.3",
  "## Changes\n- Fixed task creation bug\n- Improved performance"
);
```

### 4. PagerDuty Integration

```typescript
import { triggerPagerDutyIncident } from "@/lib/sentry/integrations";

const eventId = await triggerPagerDutyIncident(
  {
    integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
  },
  "Database Connection Lost",
  "PostgreSQL is down",
  "critical",
  { endpoint: "db.supabase.co" }
);

// Later, resolve
await resolvePagerDutyIncident(config, eventId, "Restarted PostgreSQL");
```

---

## Release Tracking

### 1. Mark Release

```typescript
import { setCurrentRelease } from "@/lib/sentry/releases";

setCurrentRelease({
  version: "1.2.3",
  commit: "abc123def456",
  branch: "main",
  author: "dev@liftgo.dev",
  timestamp: new Date().toISOString(),
  deployedTo: ["production", "europe-1"],
  status: "deployed",
});
```

### 2. Track Deployment

```typescript
import { recordDeployment } from "@/lib/sentry/releases";

recordDeployment({
  releaseId: "1.2.3",
  environment: "production",
  region: "eu-central-1",
  timestamp: new Date().toISOString(),
  status: "success",
  duration: 245, // seconds
});
```

### 3. Feature Flags & Canary Deployments

```typescript
import { setFeatureFlag, isFeatureEnabled } from "@/lib/sentry/releases";

// Enable for 10% of users
setFeatureFlag({
  name: "new-task-ui",
  enabled: true,
  percentage: 10, // Canary rollout
  userSegments: ["beta-testers"],
});

// Check if enabled for user
if (isFeatureEnabled("new-task-ui", userId)) {
  // Show new UI
}
```

### 4. Rollback Tracking

```typescript
import { recordRollback } from "@/lib/sentry/releases";

recordRollback("1.2.3", "High error rate in payment processing", "1.2.2");
```

### 5. Release Checks

```typescript
import { runDeploymentChecks } from "@/lib/sentry/releases";

const checks = await runDeploymentChecks("1.2.3");
// Returns: [{ name, status, message, severity }]

checks.forEach(check => {
  console.log(`${check.name}: ${check.status}`);
});
```

---

## User Context

### Set User Information

```typescript
import { setUser } from "@/lib/sentry";

setUser({
  id: user.id,
  email: user.email,
  username: user.username,
  role: "obrtnik",
  subscription: "pro",
  profileType: "obrtnik",
});
```

### Track User Session

```typescript
import { setContext } from "@/lib/sentry";

setContext("session", {
  sessionId: "sess_123",
  duration: 3600,
  device: "mobile",
  location: "Slovenia",
});
```

---

## Debugging & Testing

### Development Mode

In development, Sentry is verbose:

- All errors are captured
- Debug logs enabled
- Full stack traces
- 100% transaction sampling

### Test Alert Rules

```typescript
import { evaluateAlerts } from "@/lib/sentry/alerts";

// Simulate an event
const mockEvent = {
  level: "error",
  exception: {
    values: [{ value: "Database connection failed" }],
  },
};

const triggeredRules = evaluateAlerts(mockEvent);
console.log("Triggered alerts:", triggeredRules.map(r => r.name));
```

### Monitor Performance

Check Sentry Dashboard:

1. **Performance** tab: Web Vitals, transaction times
2. **Issues** tab: Error trends
3. **Releases** tab: Deployment tracking
4. **Discover** tab: Custom queries
5. **Alerts** tab: Alert status

### Local Testing

```bash
# Start with Sentry enabled
NEXT_PUBLIC_SENTRY_DSN=https://... npm run dev

# View logs
curl http://localhost:3000/api/sentry-example-api

# Check error boundary
curl http://localhost:3000/sentry-example-page
```

---

## Production Checklist

- [ ] Environment variables configured
- [ ] Sentry DSN set
- [ ] Slack webhooks configured
- [ ] Error boundary deployed
- [ ] Performance monitoring enabled
- [ ] Alert rules reviewed
- [ ] Release tracking setup
- [ ] Session replay enabled (privacy reviewed)
- [ ] Source maps uploaded
- [ ] On-call rotation setup
- [ ] Alert channels tested
- [ ] Jira integration verified

---

## Performance Optimization Tips

### 1. Sampling Rates

Adjust for your traffic:

```typescript
// Heavy traffic? Use lower sampling
tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0

// High-value transactions? Use higher sampling
function getTraceSampleRate(context) {
  if (context.transactionContext.name.includes("payment")) {
    return 1.0; // Always sample payments
  }
  return 0.1; // Sample others
}
```

### 2. Breadcrumb Filtering

Keep only important breadcrumbs:

```typescript
beforeBreadcrumb(breadcrumb) {
  // Skip debug logs
  if (breadcrumb.level === "debug") return null;
  
  // Skip polling requests
  if (breadcrumb.data?.url?.includes("/health")) return null;
  
  return breadcrumb;
}
```

### 3. Memory Management

Periodically flush metrics:

```typescript
setInterval(() => {
  flushApiMetrics();
}, 60000); // Every minute
```

---

## Troubleshooting

### Events not appearing in Sentry

1. Check DSN is correct
2. Verify network requests to `ingest.sentry.io`
3. Check `beforeSend` filter isn't dropping events
4. Ensure `enabled: true` in config

### Alert not firing

1. Check alert rule condition
2. Verify cooldown period hasn't passed
3. Check webhook URLs are correct
4. Review integration credentials

### High quota usage

1. Lower `tracesSampleRate`
2. Filter non-essential breadcrumbs
3. Use `beforeSend` to drop low-priority events
4. Archive old releases

---

## Resources

- [Sentry Docs](https://docs.sentry.io/)
- [Next.js Integration](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Performance Monitoring](https://docs.sentry.io/platforms/javascript/performance/)
- [Release Tracking](https://docs.sentry.io/platforms/javascript/releases/)
- [Alert Rules](https://docs.sentry.io/alerts/)

---

**Last Updated**: April 2026  
**Version**: 2.0 Enterprise  
**Status**: Production Ready
