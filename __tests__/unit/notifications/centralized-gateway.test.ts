const insertMock = jest.fn().mockReturnValue({ error: null })

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'notifications') return { insert: insertMock }
      return { insert: jest.fn() }
    },
  },
}))

jest.mock('@/lib/push-notifications', () => ({
  sendPushToUser: jest.fn().mockResolvedValue(undefined),
}))

import { sendNotification, sendNotificationBatch, type NotificationType } from '@/lib/notifications'

describe('centralized notification gateway', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // --- recipient ownership ---

  it('passes userId into user_id column', async () => {
    await sendNotification({
      userId: 'user-abc',
      type: 'nova_ponudba',
      title: 'Test',
      message: 'msg',
    })

    expect(insertMock).toHaveBeenCalledTimes(1)
    const row = insertMock.mock.calls[0][0]
    expect(row.user_id).toBe('user-abc')
  })

  it('allows null userId for admin alerts', async () => {
    const result = await sendNotification({
      userId: null,
      type: 'lead_no_match',
      title: 'Admin alert',
      message: 'No matches',
    })

    expect(result.success).toBe(true)
    const row = insertMock.mock.calls[0][0]
    expect(row.user_id).toBeNull()
  })

  // --- type validation ---

  it('writes the notification type as-is', async () => {
    const types: NotificationType[] = [
      'nova_ponudba',
      'ponudba_sprejeta',
      'novo_sporocilo',
      'lead_escalation',
      'NEW_REQUEST_MATCHED',
    ]

    for (const type of types) {
      insertMock.mockClear()
      await sendNotification({ userId: 'u1', type, title: 't', message: 'm' })
      expect(insertMock.mock.calls[0][0].type).toBe(type)
    }
  })

  // --- payload structure preserved ---

  it('populates both message/body and link/action_url for backwards compat', async () => {
    await sendNotification({
      userId: 'u1',
      type: 'nova_ponudba',
      title: 'Title',
      message: 'Hello',
      link: '/path',
      metadata: { key: 'val' },
    })

    const row = insertMock.mock.calls[0][0]
    expect(row.message).toBe('Hello')
    expect(row.body).toBe('Hello')
    expect(row.link).toBe('/path')
    expect(row.action_url).toBe('/path')
    expect(row.metadata).toEqual({ key: 'val' })
    expect(row.data).toEqual({ key: 'val' })
    expect(row.read).toBe(false)
  })

  // --- batch ---

  it('batch inserts multiple notifications in one call', async () => {
    const items = [
      { userId: 'u1', type: 'novo_povprasevanje' as const, title: 'A', message: 'a' },
      { userId: 'u2', type: 'novo_povprasevanje' as const, title: 'B', message: 'b' },
    ]

    const result = await sendNotificationBatch(items)
    expect(result.success).toBe(true)
    expect(insertMock).toHaveBeenCalledTimes(1)
    const rows = insertMock.mock.calls[0][0]
    expect(rows).toHaveLength(2)
    expect(rows[0].user_id).toBe('u1')
    expect(rows[1].user_id).toBe('u2')
  })

  it('batch with empty array is a no-op', async () => {
    const result = await sendNotificationBatch([])
    expect(result.success).toBe(true)
    expect(insertMock).not.toHaveBeenCalled()
  })

  // --- error propagation ---

  it('returns success:false when insert fails', async () => {
    insertMock.mockReturnValueOnce({ error: { message: 'db error' } })

    const result = await sendNotification({
      userId: 'u1',
      type: 'nova_ponudba',
      title: 'T',
      message: 'M',
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('db error')
  })

  // --- no duplicate on repeated action ---

  it('idempotent: calling twice creates two rows (caller is responsible for dedup)', async () => {
    const params = { userId: 'u1', type: 'ponudba_sprejeta' as const, title: 'T', message: 'M' }
    await sendNotification(params)
    await sendNotification(params)
    expect(insertMock).toHaveBeenCalledTimes(2)
  })
})
