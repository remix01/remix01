// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import posthog from 'posthog-js'
import { POSTHOG_CONFIG } from './lib/posthog/config'

const tracesSampleRate = process.env.NODE_ENV === "production" ? 0.1 : 1;
const sentryRelease =
  process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA;

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Add optional integrations for additional features
  integrations: [Sentry.replayIntegration()],

  // Define how likely traces are sampled. In production we keep this low to control cost.
  tracesSampleRate,
  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Define how likely Replay events are sampled.
  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // Define how likely Replay events are sampled when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // Avoid sending user PII (Personally Identifiable Information)
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#sendDefaultPii
  sendDefaultPii: false,

  release: sentryRelease,
  initialScope: {
    tags: {
      release: sentryRelease,
    },
  },
});

if (POSTHOG_CONFIG.apiKey) {
  posthog.init(POSTHOG_CONFIG.apiKey, {
    ...POSTHOG_CONFIG.initialization,
    api_host: POSTHOG_CONFIG.apiHost,
    defaults: POSTHOG_CONFIG.defaults,
    loaded: (ph) => {
      if (process.env.NODE_ENV === 'development') {
        ph.debug()
        console.log('[PostHog] Initialized in development mode')
      }
    },
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
