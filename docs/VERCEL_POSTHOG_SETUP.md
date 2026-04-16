# Vercel + PostHog Setup Checklist

This project is now wired to initialize PostHog from public env vars in production and development.

## Required Vercel Environment Variables

Add these in **Vercel → Project → Settings → Environment Variables** for `Production`, `Preview`, and optionally `Development`:

- `NEXT_PUBLIC_POSTHOG_KEY` → your PostHog **Project API Key** (starts with `phc_`)
- `NEXT_PUBLIC_POSTHOG_HOST` → PostHog ingest host:
  - US cloud: `https://us.i.posthog.com`
  - EU cloud: `https://eu.i.posthog.com`
  - Self-hosted: your own host

## Verification steps after deploy

1. Open deployed app in browser.
2. Navigate across a few pages.
3. In PostHog, confirm `$pageview` events appear.
4. Confirm autocapture events (clicks etc.) appear.

## Notes

- If `NEXT_PUBLIC_POSTHOG_KEY` is missing, PostHog remains disabled with no runtime errors.
- Pageviews are tracked manually on route changes in App Router.
- This setup is safe for Vercel because both variables are public-prefixed and intended for browser use.
