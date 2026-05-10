import { trackFunnelEvent, FUNNEL_EVENTS } from '@/lib/analytics/funnel'
import { analytics } from '@/lib/analytics/tracker'

jest.mock('@/lib/analytics/tracker', () => ({
  analytics: {
    track: jest.fn(),
  },
}))

describe('funnel analytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('tracks funnel events with sanitized properties and timestamp', () => {
    trackFunnelEvent(FUNNEL_EVENTS.PONUDBA_SENT, {
      povprasevanje_id: 'p-1',
      category: 'Vodovodar',
      location: 'Ljubljana',
      user_type: 'obrtnik',
      obrtnik_id: 'o-1',
    }, 'u-1')

    expect(analytics.track).toHaveBeenCalledWith(
      'ponudba_sent',
      expect.objectContaining({
        povprasevanje_id: 'p-1',
        category: 'Vodovodar',
        location: 'Ljubljana',
        user_type: 'obrtnik',
        obrtnik_id: 'o-1',
      }),
      'u-1'
    )

    const payload = (analytics.track as jest.Mock).mock.calls[0][1]
    expect(payload.timestamp).toBeTruthy()
  })

  it('never throws when analytics fails', () => {
    ;(analytics.track as jest.Mock).mockImplementation(() => {
      throw new Error('offline')
    })

    expect(() => {
      trackFunnelEvent(FUNNEL_EVENTS.PAYMENT_COMPLETED, {
        povprasevanje_id: 'p-2',
        user_type: 'system',
      })
    }).not.toThrow()
  })
})
