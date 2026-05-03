import { GET as getAlerts } from '@/app/api/admin/alerts/route'
import { GET as getBriefing } from '@/app/api/ai/admin-briefing/route'

jest.mock('@/lib/admin-auth', () => ({
  requireAdmin: jest.fn(),
  toAdminAuthFailure: jest.fn((error: any) => ({ code: error?.code || 'FORBIDDEN', status: error?.status || 403 })),
}))

const fromMock = jest.fn()
jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (...args: any[]) => fromMock(...args),
  },
}))

const chatMock = jest.fn()
jest.mock('@/lib/ai/providers', () => ({
  chat: (...args: any[]) => chatMock(...args),
}))

function buildAlertsQuery(result: any) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
  }
}

function buildCountQuery(result: any) {
  return {
    select: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(result),
    then: undefined,
  }
}

describe('admin route resilience', () => {
  const { requireAdmin } = jest.requireMock('@/lib/admin-auth') as { requireAdmin: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    requireAdmin.mockResolvedValue({ userId: 'u1' })
  })

  it('admin alerts success', async () => {
    fromMock.mockReturnValueOnce(buildAlertsQuery({ data: [{ id: 1 }], error: null }))
    const res = await getAlerts()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.alerts).toHaveLength(1)
    expect(body.ok).toBe(true)
  })

  it('admin alerts empty state', async () => {
    fromMock.mockReturnValueOnce(buildAlertsQuery({ data: null, error: null }))
    const res = await getAlerts()
    const body = await res.json()
    expect(body.alerts).toEqual([])
  })

  it('admin alerts DB error returns 500', async () => {
    fromMock.mockReturnValueOnce(buildAlertsQuery({ data: null, error: { message: 'relation missing', code: '42P01' } }))
    const res = await getAlerts()
    const body = await res.json()
    expect(res.status).toBe(500)
    expect(body.alerts).toEqual([])
    expect(body.code).toBe('ALERTS_QUERY_FAILED')
  })

  it('admin briefing success', async () => {
    fromMock
      .mockReturnValueOnce(buildCountQuery({ count: 2, error: null }))
      .mockReturnValueOnce(buildCountQuery({ count: 3, error: null }))
      .mockReturnValueOnce(buildCountQuery({ count: 1, error: null }))
      .mockReturnValueOnce(buildCountQuery({ count: 0, error: null }))
      .mockReturnValueOnce(buildCountQuery({ data: [{ amount: 100, created_at: new Date().toISOString() }], error: null }))
      .mockReturnValueOnce(buildCountQuery({ data: [{ kategorija: 'vodovod' }], error: null }))
    chatMock.mockResolvedValue({ content: 'Briefing ok' })
    const res = await getBriefing()
    const body = await res.json()
    expect(body.briefing).toBe('Briefing ok')
    expect(body.fallback).toBe(false)
  })

  it('missing AI/env graceful response', async () => {
    fromMock
      .mockReturnValueOnce(buildCountQuery({ count: 0, error: null }))
      .mockReturnValueOnce(buildCountQuery({ count: 0, error: null }))
      .mockReturnValueOnce(buildCountQuery({ count: 0, error: null }))
      .mockReturnValueOnce(buildCountQuery({ count: 0, error: null }))
      .mockReturnValueOnce(buildCountQuery({ data: [], error: null }))
      .mockReturnValueOnce(buildCountQuery({ data: [], error: null }))
    chatMock.mockRejectedValue(new Error('No chat provider available'))
    const res = await getBriefing()
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.fallback).toBe(true)
    expect(body.briefing).toMatch(/ni na voljo/i)
  })

  it('unauthorized/non-admin denied', async () => {
    requireAdmin.mockRejectedValueOnce({ code: 'UNAUTHORIZED', status: 401 })
    const alertsRes = await getAlerts()
    expect(alertsRes.status).toBe(401)

    requireAdmin.mockRejectedValueOnce({ code: 'FORBIDDEN', status: 403 })
    const briefingRes = await getBriefing()
    expect(briefingRes.status).toBe(403)
  })
})
