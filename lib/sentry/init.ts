import * as Sentry from "@sentry/nextjs"

export function initSentry() {
  const isProduction = process.env.NODE_ENV === "production"
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

  Sentry.init({
    dsn,
    enabled: Boolean(dsn),
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    tracesSampleRate: isProduction ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    enableLogs: !isProduction,
    sendDefaultPii: process.env.NEXT_PUBLIC_SENTRY_SEND_DEFAULT_PII === "true",
    environment: process.env.NODE_ENV,
  })
}

export { Sentry }
