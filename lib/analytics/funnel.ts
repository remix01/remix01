import { analytics } from '@/lib/analytics/tracker'

export const FUNNEL_EVENTS = {
  POVPRASEVANJE_SUBMITTED: 'povprasevanje_submitted',
  POVPRASEVANJE_VIEWED_BY_OBRTNIK: 'povprasevanje_viewed_by_obrtnik',
  PONUDBA_SENT: 'ponudba_sent',
  PONUDBA_ACCEPTED: 'ponudba_accepted',
  PAYMENT_COMPLETED: 'payment_completed',
} as const

type FunnelEventName = (typeof FUNNEL_EVENTS)[keyof typeof FUNNEL_EVENTS]

export type FunnelProperties = {
  povprasevanje_id?: string
  category?: string | null
  location?: string | null
  user_type?: 'narocnik' | 'obrtnik' | 'system'
  obrtnik_id?: string
  timestamp?: string
}

function sanitizeProperties(properties: FunnelProperties): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...properties,
    timestamp: properties.timestamp ?? new Date().toISOString(),
  }

  Object.keys(payload).forEach((key) => {
    const value = payload[key]
    if (value === undefined || value === null || value === '') {
      delete payload[key]
    }
  })

  return payload
}

export function trackFunnelEvent(eventName: FunnelEventName, properties: FunnelProperties, userId?: string): void {
  try {
    analytics.track(eventName as any, sanitizeProperties(properties), userId)
  } catch (error) {
    console.warn('[funnel] analytics unavailable:', error)
  }
}
