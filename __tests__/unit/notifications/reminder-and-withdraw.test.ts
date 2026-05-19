jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

import { NextRequest } from 'next/server'

const appendNotificationMock = jest.fn()
const createClientMock = jest.fn()

const state = {
  reminderExisting: false,
}

function makeSupabaseMock() {
  return {
    from: (table: string) => {
      if (table === 'povprasevanja') {
        return {
          select: () => ({
            eq: (_c: string, v: string) => {
              if (v === 'odprto') return {
                is: () => ({ limit: async () => ({ data: [], error: null }) }),
                lte: () => ({
                  order: () => ({
                    range: async () => ({ data: [{ id: 'p1', title: 'Test', narocnik_id: 'n1', status: 'odprto', created_at: '2020-01-01' }] }),
                  }),
                }),
              }
              return { maybeSingle: async () => ({ data: null }) }
            },
            lte: () => ({ limit: async () => ({ data: [] }) }),
          }),
          update: () => ({ eq: () => ({ is: () => ({ select: async () => ({ data: [] }) }) }) }),
        }
      }
      if (table === 'ponudbe') {
        return { select: () => ({ eq: async () => ({ data: [{ id: 'o1', status: 'poslana' }] }) }) }
      }
      if (table === 'notifications') {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ contains: () => ({ limit: async () => ({ data: state.reminderExisting ? [{ id: 'n1' }] : [] }) }) }) }),
          }),
        }
      }
      if (table === 'obrtnik_categories') return { select: () => ({ eq: async () => ({ data: [] }) }) }
      if (table === 'obrtnik_profiles') return { select: () => ({ in: () => ({ eq: () => ({ eq: async () => ({ data: [] }) }) }) }) }
      return { select: () => ({}) }
    },
  }
}

jest.mock('@/lib/services/canonicalWriteGateway', () => ({
  canonicalWriteGateway: { appendNotification: (...args: any[]) => appendNotificationMock(...args) },
}))

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => makeSupabaseMock(),
  createClient: (...args: any[]) => createClientMock(...args),
}))

const sendNotificationMock = jest.fn().mockResolvedValue({ success: true })
jest.mock('@/lib/notifications', () => ({ sendNotification: (...args: any[]) => sendNotificationMock(...args) }))

describe('notification reminder and withdraw flows', () => {
  beforeEach(() => {
    jest.resetModules()
    jest.clearAllMocks()
    state.reminderExisting = false
    process.env.CRON_SECRET = 'test-secret'
  })

  it('repeated cron run does not create duplicate reminder', async () => {
    const { GET } = await import('@/app/api/cron/notification-sweep/route')
    const req = new NextRequest('http://localhost/api/cron/notification-sweep', { headers: { authorization: 'Bearer test-secret' } })

    await GET(req)
    state.reminderExisting = true
    await GET(req)

    const reminders = appendNotificationMock.mock.calls.filter((c) => c[0]?.type === 'izbira_ponudbe_reminder')
    expect(reminders).toHaveLength(1)
  })

  it('reminder logic keeps odprto + no-sprejeta guards', () => {
    const fs = require('fs')
    const src = fs.readFileSync('app/api/cron/notification-sweep/route.ts', 'utf8')
    expect(src).toMatch(/eq\('status', 'odprto'\)/)
    expect(src).toMatch(/some\(\(o: any\) => o\.status === 'sprejeta'\)/)
  })

  it('withdraw notification goes only to narocnik_id', async () => {
    const from = jest.fn((table: string) => {
      if (table === 'ponudbe') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'off1', obrtnik_id: 'obrtnik-1', status: 'poslana', povprasevanje_id: 'p1' } }) }) }) }
      if (table === 'povprasevanja') return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: 'p1', narocnik_id: 'narocnik-1', title: 'Beljenje' } }) }) }) }
      return { select: () => ({}) }
    })
    createClientMock.mockResolvedValue({ auth: { getUser: async () => ({ data: { user: { id: 'obrtnik-1' } } }) }, from })
    jest.doMock('@/lib/dal/ponudbe', () => ({ updatePonudba: jest.fn().mockResolvedValue({ id: 'off1' }), acceptPonudbaFull: jest.fn() }))

    const { withdrawPonudbaAction } = await import('@/app/actions/ponudbe')
    await withdrawPonudbaAction('off1')

    expect(sendNotificationMock).toHaveBeenCalledWith(expect.objectContaining({ userId: 'narocnik-1', type: 'ponudba_umaknjena' }))
    expect(sendNotificationMock).not.toHaveBeenCalledWith(expect.objectContaining({ userId: 'obrtnik-1', type: 'ponudba_umaknjena' }))
  })
})
