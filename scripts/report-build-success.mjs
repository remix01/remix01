const writeKey = process.env.SEGMENT_INTERNAL_WRITE_KEY || process.env.SEGMENT_WRITE_KEY

if (!writeKey) {
  process.exit(0)
}

const authHeader = `Basic ${Buffer.from(`${writeKey}:`).toString('base64')}`
const now = new Date().toISOString()
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA || null

const payloads = [
  {
    url: 'https://api.segment.io/v1/track',
    body: {
      userId: 'liftgo-system-health',
      event: 'Build Succeeded',
      properties: {
        internal: true,
        source: 'next-build',
        commitSha,
      },
      timestamp: now,
    },
  },
  {
    url: 'https://api.segment.io/v1/identify',
    body: {
      userId: 'liftgo-system-health',
      traits: {
        internal: true,
        build_status: 'succeeded',
        last_successful_build_at: now,
        commitSha,
      },
    },
  },
]

await Promise.allSettled(
  payloads.map(({ url, body }) =>
    fetch(url, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  )
)
