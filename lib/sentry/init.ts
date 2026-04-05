import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment & Release
    environment: process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || "unknown",

    // Performance Monitoring: Web Vitals
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.2 : 1.0,

    // Session Replay with PII masking for privacy
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
        maskAllInputs: true,
      }),
      new Sentry.ReplayCanvas(),
      new Sentry.BrowserTracing({
        // Set sampling rates for different aspects
        tracingOrigins: [
          "localhost",
          /^\//,
          process.env.NEXT_PUBLIC_VERCEL_URL || "liftgo.dev",
        ],
        routingInstrumentation: Sentry.nextjsBrowserTracingIntegration(),
      }),
    ],

    // Session Replay Sampling
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0.5,
    replaysOnErrorSampleRate: 1.0, // Always capture replay on error

    // Error filtering
    beforeSend(event, hint) {
      // Don't send errors in development for certain patterns
      if (process.env.NODE_ENV === "development") {
        // Skip network errors from slow connections
        if (event.exception) {
          const error = hint.originalException;
          if (
            error instanceof Error &&
            error.message.includes("Network")
          ) {
            return null;
          }
        }
      }
      return event;
    },

    // Breadcrumb filtering
    beforeBreadcrumb(breadcrumb, hint) {
      // Filter out non-essential console messages
      if (breadcrumb.category === "console") {
        if (
          breadcrumb.level === "debug" ||
          breadcrumb.level === "info"
        ) {
          return null;
        }
      }

      // Filter out certain fetch requests
      if (breadcrumb.category === "fetch" && breadcrumb.data?.url) {
        const url = breadcrumb.data.url as string;
        // Skip health checks
        if (url.includes("/health")) {
          return null;
        }
      }

      return breadcrumb;
    },

    // Enable only in production
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Debug mode in development
    debug: process.env.NODE_ENV === "development",

    // Max breadcrumbs
    maxBreadcrumbs: 50,

    // Attach stack traces
    attachStacktrace: true,
  });

  // Set up custom performance monitoring
  setupPerformanceMonitoring();
}

function setupPerformanceMonitoring() {
  // Monitor Web Vitals
  if (typeof window !== "undefined") {
    // Use web-vitals library if available
    try {
      import("web-vitals").then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS((metric) => {
          Sentry.captureMessage(
            `Cumulative Layout Shift: ${metric.value.toFixed(3)}`,
            "info"
          );
        });

        getFID((metric) => {
          Sentry.captureMessage(
            `First Input Delay: ${metric.value.toFixed(0)}ms`,
            "info"
          );
        });

        getFCP((metric) => {
          Sentry.captureMessage(
            `First Contentful Paint: ${metric.value.toFixed(0)}ms`,
            "info"
          );
        });

        getLCP((metric) => {
          Sentry.captureMessage(
            `Largest Contentful Paint: ${metric.value.toFixed(0)}ms`,
            "info"
          );
        });

        getTTFB((metric) => {
          Sentry.captureMessage(
            `Time to First Byte: ${metric.value.toFixed(0)}ms`,
            "info"
          );
        });
      });
    } catch (e) {
      // web-vitals not available
    }
  }
}

export { Sentry };

