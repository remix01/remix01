import * as Sentry from "@sentry/nextjs"

export function initSentry() {
  const sentryRelease = process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.feedbackIntegration(),
    ],
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    sendDefaultPii: false,
    environment: process.env.NODE_ENV,
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
    release: sentryRelease,
  })

  if (sentryRelease) {
    Sentry.setTag("release", sentryRelease)
  }
}

export { Sentry }
