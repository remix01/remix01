# Vercel + GCP Advanced Setup (Google Maps, Search, Project)

This guide configures these environment variables on Vercel:

- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`
- `GOOGLE_PROJECT_ID`

## 1) Google Cloud project preparation

1. Open **Google Cloud Console** and create/select your project.
2. Save the **Project ID** (not project name). This is your `GOOGLE_PROJECT_ID`.
3. Enable required APIs:
   - Maps JavaScript API
   - Places API
   - Geocoding API
   - Custom Search API (if using Programmable Search JSON API)
4. Create API key for Maps/Search usage and restrict it:
   - Application restriction: HTTP referrers (web)
   - API restrictions: only required APIs above

## 2) Programmable Search Engine (CSE)

1. Create a search engine at: https://programmablesearchengine.google.com/
2. Copy **Search engine ID** (`cx`).
3. Use it as `GOOGLE_SEARCH_ENGINE_ID`.

## 3) Add variables in Vercel Dashboard

In Vercel → Project → **Settings** → **Environment Variables**, add:

- `GOOGLE_MAPS_API_KEY`
- `GOOGLE_SEARCH_ENGINE_ID`
- `GOOGLE_PROJECT_ID`

Add each for all needed environments:

- Production
- Preview
- Development

## 4) Add variables with Vercel CLI (optional)

```bash
vercel env add GOOGLE_MAPS_API_KEY production
vercel env add GOOGLE_MAPS_API_KEY preview
vercel env add GOOGLE_MAPS_API_KEY development

vercel env add GOOGLE_SEARCH_ENGINE_ID production
vercel env add GOOGLE_SEARCH_ENGINE_ID preview
vercel env add GOOGLE_SEARCH_ENGINE_ID development

vercel env add GOOGLE_PROJECT_ID production
vercel env add GOOGLE_PROJECT_ID preview
vercel env add GOOGLE_PROJECT_ID development
```

Then pull them locally:

```bash
vercel env pull .env.local
```

## 5) Security checks (required)

- Never commit raw API keys.
- Rotate key immediately if leaked.
- Enforce API restrictions in Google Cloud.
- Use separate keys for dev/staging/prod if possible.

## 6) App-level availability in this repo

The environment mapping is available in `lib/env.ts` as:

- `env.GOOGLE_MAPS_API_KEY`
- `env.GOOGLE_SEARCH_ENGINE_ID`
- `env.GOOGLE_PROJECT_ID`
- `hasAdvancedGoogle()` helper to verify all three are set

## 7) Recommended verification

After deployment, verify with:

```bash
vercel env ls
```

You can also verify directly from the app health endpoint:

```bash
curl -s https://<your-domain>/api/health | jq .env.google
```

Expected shape:

```json
{
  "mapsApiKey": true,
  "searchEngineId": true,
  "projectId": true,
  "allConfigured": true
}
```

This confirms the three Google variables are present in the running Vercel environment without exposing secret values.


For full platform readiness (core + integrations + score):

```bash
curl -s https://<your-domain>/api/health | jq .env
```

Useful quick checks:

```bash
# Google only
curl -s https://<your-domain>/api/health | jq .env.google

# Completion score across key integrations
curl -s https://<your-domain>/api/health | jq .env.score

# Missing Stripe vars
curl -s https://<your-domain>/api/health | jq .env.integrations.stripe.missing
```
