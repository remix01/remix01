const SEGMENT_TRACK_URL = 'https://api.segment.io/v1/track'
const SEGMENT_IDENTIFY_URL = 'https://api.segment.io/v1/identify'
const SYSTEM_USER_ID = 'liftgo-system-health'

function getSegmentWriteKey(): string | null {
  return process.env.SEGMENT_INTERNAL_WRITE_KEY || process.env.SEGMENT_WRITE_KEY || null
}

function getAuthHeader(writeKey: string): string {
  return `Basic ${Buffer.from(`${writeKey}:`).toString('base64')}`
}

async function sendToSegment(url: string, payload: Record<string, unknown>): Promise<void> {
  const writeKey = getSegmentWriteKey()
  if (!writeKey) return

  try {
    await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: getAuthHeader(writeKey),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      cache: 'no-store',
    })
  } catch {
    // intentionally silent for internal telemetry
  }
}

export function trackInternalMetric(event: string, properties: Record<string, unknown> = {}): void {
  void sendToSegment(SEGMENT_TRACK_URL, {
    userId: SYSTEM_USER_ID,
    event,
    properties: {
      internal: true,
      ...properties,
    },
    context: {
      library: {
        name: 'liftgo-server',
        version: '1.0.0',
      },
      app: {
        name: 'liftgo',
      },
    },
    timestamp: new Date().toISOString(),
  })
}

export function identifySystemHealth(traits: Record<string, unknown>): void {
  void sendToSegment(SEGMENT_IDENTIFY_URL, {
    userId: SYSTEM_USER_ID,
    traits: {
      internal: true,
      ...traits,
      reportedAt: new Date().toISOString(),
    },
  })
}
