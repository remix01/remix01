/**
 * Sentry Alert Configuration & Rules
 * Defines alert thresholds, conditions, and routing rules
 */

import * as Sentry from "@sentry/nextjs";
import { captureMessage } from "./client";

// ============================================================================
// ALERT SEVERITY LEVELS
// ============================================================================

export enum AlertSeverity {
  CRITICAL = "critical",
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
  INFO = "info",
}

export enum AlertChannel {
  SLACK_CRITICAL = "slack-critical",
  SLACK_ENGINEERING = "slack-engineering",
  SLACK_BUSINESS = "slack-business",
  EMAIL_ONCALL = "email-oncall",
  EMAIL_TEAM = "email-team",
  JIRA = "jira",
  PAGERDUTY = "pagerduty",
}

// ============================================================================
// ALERT RULES
// ============================================================================

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: (event: any) => boolean;
  severity: AlertSeverity;
  channels: AlertChannel[];
  cooldownMinutes: number;
  autoResolve: boolean;
}

// Core alert rules
export const ALERT_RULES: AlertRule[] = [
  // Critical: High error rate
  {
    id: "high-error-rate",
    name: "High Error Rate",
    description: "Error rate exceeds 5% within 5 minutes",
    condition: (event) => event.exception && event.level === "error",
    severity: AlertSeverity.CRITICAL,
    channels: [AlertChannel.SLACK_CRITICAL, AlertChannel.EMAIL_ONCALL, AlertChannel.PAGERDUTY],
    cooldownMinutes: 15,
    autoResolve: true,
  },

  // Critical: Database connection errors
  {
    id: "db-connection-error",
    name: "Database Connection Error",
    description: "Database connectivity issues detected",
    condition: (event) =>
      event.exception &&
      event.exception.values?.[0]?.value?.includes("database") &&
      event.level === "error",
    severity: AlertSeverity.CRITICAL,
    channels: [
      AlertChannel.SLACK_CRITICAL,
      AlertChannel.EMAIL_ONCALL,
      AlertChannel.JIRA,
    ],
    cooldownMinutes: 10,
    autoResolve: true,
  },

  // Critical: Payment/Stripe errors
  {
    id: "payment-processing-error",
    name: "Payment Processing Error",
    description: "Stripe or payment gateway error detected",
    condition: (event) =>
      event.exception &&
      (event.exception.values?.[0]?.value?.includes("stripe") ||
        event.exception.values?.[0]?.value?.includes("payment")) &&
      event.level === "error",
    severity: AlertSeverity.CRITICAL,
    channels: [
      AlertChannel.SLACK_CRITICAL,
      AlertChannel.EMAIL_ONCALL,
      AlertChannel.PAGERDUTY,
      AlertChannel.JIRA,
    ],
    cooldownMinutes: 5,
    autoResolve: false,
  },

  // High: Authentication failures
  {
    id: "auth-failure",
    name: "Authentication Failure",
    description: "Multiple failed authentication attempts",
    condition: (event) =>
      event.exception &&
      (event.exception.values?.[0]?.value?.includes("auth") ||
        event.exception.values?.[0]?.value?.includes("unauthorized")) &&
      event.level === "error",
    severity: AlertSeverity.HIGH,
    channels: [AlertChannel.SLACK_ENGINEERING, AlertChannel.EMAIL_TEAM],
    cooldownMinutes: 10,
    autoResolve: true,
  },

  // High: API response time degradation
  {
    id: "slow-api-endpoint",
    name: "Slow API Endpoint",
    description: "API endpoint response time exceeds 5 seconds",
    condition: (event) =>
      event.message?.includes("Performance") &&
      parseInt(event.message) > 5000,
    severity: AlertSeverity.HIGH,
    channels: [AlertChannel.SLACK_ENGINEERING],
    cooldownMinutes: 15,
    autoResolve: true,
  },

  // Medium: Memory/Performance issues
  {
    id: "performance-degradation",
    name: "Performance Degradation",
    description: "Application performance issues detected",
    condition: (event) =>
      event.message?.includes("Metric") &&
      event.level !== "error",
    severity: AlertSeverity.MEDIUM,
    channels: [AlertChannel.SLACK_ENGINEERING],
    cooldownMinutes: 30,
    autoResolve: true,
  },

  // Medium: Unhandled promise rejections
  {
    id: "unhandled-rejection",
    name: "Unhandled Promise Rejection",
    description: "Unhandled promise rejection detected",
    condition: (event) =>
      event.exception &&
      event.exception.mechanism?.type === "onunhandledrejection",
    severity: AlertSeverity.MEDIUM,
    channels: [AlertChannel.SLACK_ENGINEERING],
    cooldownMinutes: 20,
    autoResolve: true,
  },

  // Low: Deprecation warnings
  {
    id: "deprecation-warning",
    name: "Deprecation Warning",
    description: "Use of deprecated API or feature",
    condition: (event) =>
      event.message?.includes("deprecated") &&
      event.level === "warning",
    severity: AlertSeverity.LOW,
    channels: [AlertChannel.SLACK_ENGINEERING],
    cooldownMinutes: 60,
    autoResolve: true,
  },

  // Business: Important user events
  {
    id: "business-event-anomaly",
    name: "Business Event Anomaly",
    description: "Unusual business event detected",
    condition: (event) =>
      event.tags?.["business_event"] === true &&
      event.level === "warning",
    severity: AlertSeverity.MEDIUM,
    channels: [AlertChannel.SLACK_BUSINESS],
    cooldownMinutes: 30,
    autoResolve: true,
  },
];

// ============================================================================
// ALERT ROUTING LOGIC
// ============================================================================

const alertCooldowns = new Map<string, number>();

export function shouldAlert(ruleId: string): boolean {
  const lastAlert = alertCooldowns.get(ruleId);
  if (!lastAlert) return true;

  const now = Date.now();
  const rule = ALERT_RULES.find((r) => r.id === ruleId);
  const cooldownMs = (rule?.cooldownMinutes || 15) * 60 * 1000;

  return now - lastAlert > cooldownMs;
}

export function recordAlert(ruleId: string): void {
  alertCooldowns.set(ruleId, Date.now());
}

export function evaluateAlerts(event: any): AlertRule[] {
  return ALERT_RULES.filter((rule) => {
    if (!shouldAlert(rule.id)) return false;
    if (!rule.condition(event)) return false;
    return true;
  });
}

// ============================================================================
// ALERT SENDING
// ============================================================================

export async function sendAlert(
  rule: AlertRule,
  event: any,
  message: string
): Promise<void> {
  recordAlert(rule.id);

  const alertData = {
    ruleId: rule.id,
    ruleName: rule.name,
    severity: rule.severity,
    message,
    timestamp: new Date().toISOString(),
    eventId: event.event_id,
    environment: event.environment || "unknown",
  };

  // Log alert for audit trail
  captureMessage(`Alert: ${rule.name} - ${message}`, "warning", alertData);

  // Route to channels
  for (const channel of rule.channels) {
    await routeToChannel(channel, rule, event, message);
  }
}

async function routeToChannel(
  channel: AlertChannel,
  rule: AlertRule,
  event: any,
  message: string
): Promise<void> {
  const baseUrl = process.env.SENTRY_WEBHOOK_URL || "https://sentry.example.com";

  switch (channel) {
    case AlertChannel.SLACK_CRITICAL:
      await sendSlackAlert(
        process.env.SLACK_WEBHOOK_CRITICAL,
        rule,
        message,
        "danger"
      );
      break;

    case AlertChannel.SLACK_ENGINEERING:
      await sendSlackAlert(
        process.env.SLACK_WEBHOOK_ENGINEERING,
        rule,
        message,
        "warning"
      );
      break;

    case AlertChannel.SLACK_BUSINESS:
      await sendSlackAlert(
        process.env.SLACK_WEBHOOK_BUSINESS,
        rule,
        message,
        "info"
      );
      break;

    case AlertChannel.EMAIL_ONCALL:
      await sendEmailAlert(
        process.env.EMAIL_ONCALL,
        rule,
        message
      );
      break;

    case AlertChannel.EMAIL_TEAM:
      await sendEmailAlert(
        process.env.EMAIL_TEAM,
        rule,
        message
      );
      break;

    case AlertChannel.JIRA:
      await createJiraTicket(rule, message);
      break;

    case AlertChannel.PAGERDUTY:
      await triggerPagerDuty(rule, message);
      break;
  }
}

async function sendSlackAlert(
  webhookUrl: string | undefined,
  rule: AlertRule,
  message: string,
  color: string
): Promise<void> {
  if (!webhookUrl) return;

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attachments: [
          {
            color,
            title: `🚨 ${rule.name}`,
            text: message,
            fields: [
              {
                title: "Severity",
                value: rule.severity.toUpperCase(),
                short: true,
              },
              {
                title: "Time",
                value: new Date().toISOString(),
                short: true,
              },
            ],
            footer: "LiftGO Sentry Monitoring",
            ts: Math.floor(Date.now() / 1000),
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Failed to send Slack alert:", error);
  }
}

async function sendEmailAlert(
  email: string | undefined,
  rule: AlertRule,
  message: string
): Promise<void> {
  if (!email) return;

  try {
    await fetch("/api/notifications/email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: `[${rule.severity.toUpperCase()}] ${rule.name}`,
        body: message,
        alertRule: rule.id,
      }),
    });
  } catch (error) {
    console.error("Failed to send email alert:", error);
  }
}

async function createJiraTicket(rule: AlertRule, message: string): Promise<void> {
  if (!process.env.JIRA_API_URL) return;

  try {
    await fetch(`${process.env.JIRA_API_URL}/issues`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.JIRA_API_TOKEN}`,
      },
      body: JSON.stringify({
        fields: {
          project: { key: process.env.JIRA_PROJECT_KEY || "LIFTGO" },
          issuetype: { name: "Bug" },
          summary: rule.name,
          description: message,
          priority: { name: getPriorityFromSeverity(rule.severity) },
          labels: ["sentry-alert", rule.id],
        },
      }),
    });
  } catch (error) {
    console.error("Failed to create Jira ticket:", error);
  }
}

async function triggerPagerDuty(rule: AlertRule, message: string): Promise<void> {
  if (!process.env.PAGERDUTY_INTEGRATION_KEY) return;

  try {
    await fetch("https://events.pagerduty.com/v2/enqueue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routing_key: process.env.PAGERDUTY_INTEGRATION_KEY,
        event_action: "trigger",
        payload: {
          summary: rule.name,
          severity: rule.severity,
          source: "LiftGO Sentry",
          custom_details: { message, ruleId: rule.id },
        },
      }),
    });
  } catch (error) {
    console.error("Failed to trigger PagerDuty alert:", error);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getPriorityFromSeverity(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return "Highest";
    case AlertSeverity.HIGH:
      return "High";
    case AlertSeverity.MEDIUM:
      return "Medium";
    case AlertSeverity.LOW:
    case AlertSeverity.INFO:
      return "Low";
  }
}

export { Sentry };
