// This file is the Next.js client instrumentation entry point.
// Sentry is initialised via sentry.client.config.ts (injected by withSentryConfig at build time).
// We only export the router transition hook here.

export { captureRouterTransitionStart as onRouterTransitionStart } from "@sentry/nextjs";
