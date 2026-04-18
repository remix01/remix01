#!/usr/bin/env node

/**
 * Sentry healthcheck helper.
 *
 * 1) Calls a known failing route (`/api/sentry-example-api`) and expects >=500.
 * 2) Optionally polls Sentry Issues API for the expected exception title.
 *
 * Environment variables:
 * - HEALTHCHECK_BASE_URL (default: http://localhost:3000)
 * - SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN (optional for API polling)
 * - SENTRY_HEALTHCHECK_TIMEOUT_MS (default: 120000)
 * - SENTRY_HEALTHCHECK_INTERVAL_MS (default: 8000)
 * - SENTRY_HEALTHCHECK_STRICT=1 -> fail if Sentry API creds are missing.
 */

const baseUrl = (process.env.HEALTHCHECK_BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
const timeoutMs = Number(process.env.SENTRY_HEALTHCHECK_TIMEOUT_MS || 120000)
const intervalMs = Number(process.env.SENTRY_HEALTHCHECK_INTERVAL_MS || 8000)
const strict = process.env.SENTRY_HEALTHCHECK_STRICT === '1'

const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT
const sentryToken = process.env.SENTRY_AUTH_TOKEN
const expectedTitle = 'SentryExampleAPIError'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function triggerRouteError() {
  const url = `${baseUrl}/api/sentry-example-api`
  const res = await fetch(url)

  if (res.status < 500) {
    const body = await res.text().catch(() => '')
    throw new Error(`Expected 5xx from ${url}, got ${res.status}. Body: ${body.slice(0, 300)}`)
  }

  console.log(`[healthcheck] ✅ Trigger route responded with ${res.status} as expected: ${url}`)
}

async function findIssueInSentry() {
  if (!sentryOrg || !sentryProject || !sentryToken) {
    if (strict) {
      throw new Error('Missing Sentry API credentials (SENTRY_ORG, SENTRY_PROJECT, SENTRY_AUTH_TOKEN) in strict mode')
    }

    console.log('[healthcheck] ⚠️ Sentry API credentials missing; skipping Issues polling step')
    return
  }

  const deadline = Date.now() + timeoutMs
  const encodedQuery = encodeURIComponent('is:unresolved SentryExampleAPIError')

  while (Date.now() < deadline) {
    const url = `https://sentry.io/api/0/projects/${encodeURIComponent(sentryOrg)}/${encodeURIComponent(sentryProject)}/issues/?query=${encodedQuery}`

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${sentryToken}`,
      },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`Sentry API request failed (${res.status}): ${body.slice(0, 400)}`)
    }

    const issues = await res.json()
    const found = Array.isArray(issues) && issues.some((issue) => {
      const title = String(issue?.title || '')
      return title.includes(expectedTitle)
    })

    if (found) {
      console.log(`[healthcheck] ✅ Found '${expectedTitle}' in Sentry Issues`) 
      return
    }

    console.log(`[healthcheck] Waiting for '${expectedTitle}' to appear in Sentry Issues...`)
    await sleep(intervalMs)
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for '${expectedTitle}' in Sentry Issues`)
}

async function main() {
  await triggerRouteError()
  await findIssueInSentry()
  console.log('[healthcheck] Done')
}

main().catch((err) => {
  console.error('[healthcheck] ❌', err?.message || err)
  process.exit(1)
})
