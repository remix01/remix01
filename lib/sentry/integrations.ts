/**
 * Sentry Integrations
 * Handles integration with external services: Slack, Jira, GitHub, PagerDuty
 */

import * as Sentry from "@sentry/nextjs";
import { captureMessage } from "./client";

// ============================================================================
// SLACK INTEGRATION
// ============================================================================

export interface SlackConfig {
  webhookUrl: string;
  channel: string;
  username?: string;
  iconEmoji?: string;
}

export async function sendSlackNotification(
  config: SlackConfig,
  title: string,
  message: string,
  details?: Record<string, any>,
  color?: "good" | "warning" | "danger"
): Promise<void> {
  if (!config.webhookUrl) {
    console.warn("Slack webhook URL not configured");
    return;
  }

  try {
    const payload = {
      channel: config.channel,
      username: config.username || "LiftGO Sentry",
      icon_emoji: config.iconEmoji || ":warning:",
      attachments: [
        {
          color: color || "danger",
          title,
          text: message,
          fields: details
            ? Object.entries(details).map(([key, value]) => ({
                title: key.charAt(0).toUpperCase() + key.slice(1),
                value: String(value),
                short: true,
              }))
            : undefined,
          footer: "LiftGO Sentry Monitoring",
          ts: Math.floor(Date.now() / 1000),
        },
      ],
    };

    const response = await fetch(config.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }

    captureMessage("Slack notification sent", "info", { title });
  } catch (error) {
    console.error("Failed to send Slack notification:", error);
    captureMessage("Slack notification failed", "error", {
      title,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// JIRA INTEGRATION
// ============================================================================

export interface JiraConfig {
  baseUrl: string;
  apiToken: string;
  projectKey: string;
  username: string;
}

export interface JiraIssueData {
  summary: string;
  description: string;
  issueType?: string; // Bug, Task, etc.
  priority?: string; // Highest, High, Medium, Low, Lowest
  labels?: string[];
  customFields?: Record<string, any>;
}

export async function createJiraIssue(
  config: JiraConfig,
  issue: JiraIssueData
): Promise<string | null> {
  if (!config.baseUrl || !config.apiToken) {
    console.warn("Jira configuration incomplete");
    return null;
  }

  try {
    const auth = Buffer.from(
      `${config.username}:${config.apiToken}`
    ).toString("base64");

    const payload = {
      fields: {
        project: { key: config.projectKey },
        issuetype: { name: issue.issueType || "Bug" },
        summary: issue.summary,
        description: issue.description,
        priority: issue.priority ? { name: issue.priority } : undefined,
        labels: issue.labels || [],
        ...issue.customFields,
      },
    };

    const response = await fetch(`${config.baseUrl}/rest/api/3/issue`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.statusText}`);
    }

    const result = await response.json() as { key: string };
    const issueKey = result.key;

    captureMessage("Jira issue created", "info", { issueKey });
    return issueKey;
  } catch (error) {
    console.error("Failed to create Jira issue:", error);
    captureMessage("Jira issue creation failed", "error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function updateJiraIssue(
  config: JiraConfig,
  issueKey: string,
  updates: Record<string, any>
): Promise<boolean> {
  if (!config.baseUrl || !config.apiToken) {
    console.warn("Jira configuration incomplete");
    return false;
  }

  try {
    const auth = Buffer.from(
      `${config.username}:${config.apiToken}`
    ).toString("base64");

    const response = await fetch(
      `${config.baseUrl}/rest/api/3/issue/${issueKey}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fields: updates }),
      }
    );

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.statusText}`);
    }

    captureMessage("Jira issue updated", "info", { issueKey });
    return true;
  } catch (error) {
    console.error("Failed to update Jira issue:", error);
    return false;
  }
}

export async function addJiraComment(
  config: JiraConfig,
  issueKey: string,
  comment: string
): Promise<boolean> {
  if (!config.baseUrl || !config.apiToken) {
    console.warn("Jira configuration incomplete");
    return false;
  }

  try {
    const auth = Buffer.from(
      `${config.username}:${config.apiToken}`
    ).toString("base64");

    const response = await fetch(
      `${config.baseUrl}/rest/api/3/issue/${issueKey}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: {
            version: 1,
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [
                  {
                    type: "text",
                    text: comment,
                  },
                ],
              },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.statusText}`);
    }

    captureMessage("Jira comment added", "info", { issueKey });
    return true;
  } catch (error) {
    console.error("Failed to add Jira comment:", error);
    return false;
  }
}

// ============================================================================
// GITHUB INTEGRATION
// ============================================================================

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
}

export async function createGitHubIssue(
  config: GitHubConfig,
  title: string,
  body: string,
  labels?: string[]
): Promise<number | null> {
  if (!config.token) {
    console.warn("GitHub token not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/issues`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          body,
          labels: labels || ["sentry-alert"],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const result = await response.json() as { number: number };
    const issueNumber = result.number;

    captureMessage("GitHub issue created", "info", {
      issueNumber,
      repo: `${config.owner}/${config.repo}`,
    });
    return issueNumber;
  } catch (error) {
    console.error("Failed to create GitHub issue:", error);
    captureMessage("GitHub issue creation failed", "error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function createGitHubRelease(
  config: GitHubConfig,
  tagName: string,
  releaseName: string,
  body: string,
  draft?: boolean
): Promise<string | null> {
  if (!config.token) {
    console.warn("GitHub token not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.owner}/${config.repo}/releases`,
      {
        method: "POST",
        headers: {
          Authorization: `token ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tag_name: tagName,
          name: releaseName,
          body,
          draft: draft || false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const result = await response.json() as { id: number };
    const releaseId = result.id;

    captureMessage("GitHub release created", "info", {
      tagName,
      releaseName,
      repo: `${config.owner}/${config.repo}`,
    });
    return String(releaseId);
  } catch (error) {
    console.error("Failed to create GitHub release:", error);
    captureMessage("GitHub release creation failed", "error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ============================================================================
// PAGERDUTY INTEGRATION
// ============================================================================

export interface PagerDutyConfig {
  integrationKey: string;
  apiKey?: string;
  serviceId?: string;
}

export async function triggerPagerDutyIncident(
  config: PagerDutyConfig,
  title: string,
  description: string,
  severity: "critical" | "error" | "warning" | "info" = "critical",
  customDetails?: Record<string, any>
): Promise<string | null> {
  if (!config.integrationKey) {
    console.warn("PagerDuty integration key not configured");
    return null;
  }

  try {
    const response = await fetch(
      "https://events.pagerduty.com/v2/enqueue",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routing_key: config.integrationKey,
          event_action: "trigger",
          payload: {
            summary: title,
            severity,
            source: "LiftGO Sentry",
            custom_details: {
              description,
              ...customDetails,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.statusText}`);
    }

    const result = await response.json() as { id: string };
    const eventId = result.id;

    captureMessage("PagerDuty incident triggered", "info", {
      eventId,
      title,
      severity,
    });
    return eventId;
  } catch (error) {
    console.error("Failed to trigger PagerDuty incident:", error);
    captureMessage("PagerDuty incident trigger failed", "error", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

export async function resolvePagerDutyIncident(
  config: PagerDutyConfig,
  eventId: string,
  resolution: string
): Promise<boolean> {
  if (!config.integrationKey) {
    console.warn("PagerDuty integration key not configured");
    return false;
  }

  try {
    const response = await fetch(
      "https://events.pagerduty.com/v2/enqueue",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routing_key: config.integrationKey,
          event_action: "resolve",
          payload: {
            custom_details: { resolution },
          },
          dedup_key: eventId,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.statusText}`);
    }

    captureMessage("PagerDuty incident resolved", "info", {
      eventId,
      resolution,
    });
    return true;
  } catch (error) {
    console.error("Failed to resolve PagerDuty incident:", error);
    return false;
  }
}

export { Sentry };
