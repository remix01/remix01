// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: Boolean(dsn),

  // Keep cost-controlled traces in production while retaining full dev visibility.
  tracesSampleRate: isProduction ? 0.1 : 1,

  // Keep SDK diagnostics in non-production only.
  enableLogs: !isProduction,

  // Gate PII collection via explicit env policy.
  sendDefaultPii: process.env.SENTRY_SEND_DEFAULT_PII === "true",
  environment: process.env.NODE_ENV,
});
