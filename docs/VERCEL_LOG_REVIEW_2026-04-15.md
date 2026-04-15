# Vercel Runtime Log Review (2026-04-15)

## Scope
- Source window: **2026-04-15 14:52:00Z → 15:22:00Z**
- Sample size: **30 runtime log lines**
- Deployment: `dpl_yDBHETjpiKsrDTBqV7QrWsmpZA7S`

## What is healthy

1. **Cron heartbeat looks stable**
   - `/api/cron/health-sweep` appears every ~2 minutes.
   - `/api/cron/event-processor` appears every ~5 minutes.
   - `/api/cron/notification-sweep` appears every ~5 minutes.
   - All sampled executions returned **HTTP 200**.

2. **No sampled 5xx errors**
   - In this window, scheduled jobs were not throwing fatal errors.

## Findings that need action

1. **Transient upstream network issue on dynamic route fetch**
   - `level=warning` for `[dynamic-route-fetch] exception`
   - URL: `https://api.liftgo.net/pro/sanacija-vlage/murska-sobota`
   - reason: `network_error`, error: `fetch failed`
   - The request still ended as 200 (likely fallback path), so user-facing impact may be limited, but this should be tracked.

2. **Bot/scanner traffic hitting WordPress path**
   - `POST /xmlrpc.php` returned **404** (expected for non-WP app).
   - No production incident from this line; this is common internet probing traffic.

3. **Cron configuration coverage was incomplete**
   - Multiple cron handlers exist in `app/api/cron/**`, but only a subset were scheduled in `vercel.json`.
   - Added schedules for missing handlers (see “Changes made”).

## Changes made

Updated `vercel.json` with missing cron schedules:

- `/api/cron/retry-commission-transfers` → `*/30 * * * *`
- `/api/cron/sla-task-expiry` → `0 * * * *`
- `/api/cron/detect-anomalies` → `15 * * * *`
- `/api/cron/backfill-embeddings` → `*/15 * * * *`

These align with route comments and expected periodic automation behavior.

## Recommended follow-ups

1. Add Vercel log alert for repeated `[dynamic-route-fetch] exception` above threshold (for example, 5+ in 10 minutes).
2. Consider firewall/WAF rule or middleware hard-block for `xmlrpc.php` probes if noise increases.
3. After deployment, verify the new cron routes appear in Vercel Logs at expected cadences.
