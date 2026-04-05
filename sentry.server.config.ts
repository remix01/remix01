// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://48711f0deb77ec04e76c4e80a2a81093@o4511142901448704.ingest.de.sentry.io/4511143182794832",

  // Project environment
  environment: process.env.NODE_ENV || "development",

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "unknown",

  // Performance Monitoring: Adaptive sampling based on transaction type
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

  // Advanced Trace Configuration
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],

  // Database Performance Monitoring
  beforeSend(event, hint) {
    // Filter out low-priority errors in production
    if (process.env.NODE_ENV === "production") {
      if (event.exception) {
        const error = hint.originalException;
        if (error instanceof Error) {
          // Skip non-critical errors
          if (
            error.message.includes("NEXT_REDIRECT") ||
            error.message.includes("NEXT_NOT_FOUND")
          ) {
            return null;
          }
        }
      }
    }
    return event;
  },

  // Enable debug logging in non-production
  debug: process.env.NODE_ENV !== "production",

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Enable sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Maximum number of breadcrumbs to keep
  maxBreadcrumbs: 50,

  // Attach stack trace to all messages
  attachStacktrace: true,

  // Allow URLs to send to Sentry
  allowUrls: [
    /https?:\/\/(cdn\.)?liftgo\.(dev|com|io)/,
    /https?:\/\/(cdn\.)?localhost/,
    /vercel\.app/,
  ],
});

