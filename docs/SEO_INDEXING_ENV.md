# SEO Indexing Environment Controls

This project controls the `X-Robots-Tag` response header in `middleware.ts` via `lib/seo-indexing.ts`.

## Rules

- **Production (`VERCEL_ENV=production`)**: public pages are indexable (no `X-Robots-Tag` header).
- **Preview/Development/Staging (`VERCEL_ENV!=production`)**: all pages return `X-Robots-Tag: noindex, nofollow`.
- **Sensitive routes in any environment** (`/admin`, `/auth`, `/api`): always `noindex, nofollow`.

## Required Vercel Variables

- `VERCEL_ENV`
  - Set automatically by Vercel (`production`, `preview`, `development`).
  - Used as the primary signal for indexing behavior.
- `ALLOW_INDEXING`
  - Optional override. If `true`, indexing is enabled even outside Vercel production.
  - Accepted truthy values: `1`, `true`, `yes`, `on`.
- `NODE_ENV`
  - Present in production builds, but **not used as the source of truth** for indexing because preview deployments also build with production optimizations.

## Verification Commands

```bash
curl -I https://v0-liftgo-platform-concept-info-36187542s-projects.vercel.app/ | grep -i x-robots-tag
curl https://v0-liftgo-platform-concept-info-36187542s-projects.vercel.app/robots.txt
```

Expected for production homepage:
- no `x-robots-tag` header on `/` (or explicitly `index, follow` if you choose to set it)
