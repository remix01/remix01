const sendMock = jest.fn()

jest.mock('@/lib/resend', () => ({
  resolveEmailRecipients: jest.fn((to: string | string[]) => {
    const list = Array.isArray(to) ? to : [to]
    if (list.some((v) => !v.includes('@'))) throw new Error('invalid recipient')
    return { to: ['redirect@example.com'], originalTo: list, redirected: true }
  }),
}))
const getEmailProviderMock = jest.fn(() => ({ name: 'resend', send: sendMock }))
jest.mock('@/lib/email/provider', () => ({
  getEmailProvider: () => getEmailProviderMock(),
}))

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({ maybeSingle: jest.fn(async () => ({ data: { amount_cents: 1200 } })), single: jest.fn(async () => ({ data: { email: 'customer@example.com', ime: 'Janez' } })) })),
      })),
      insert: jest.fn(async () => ({})),
    })),
  },
}))

import { handleEmailJob } from '@/lib/jobs/workers/emailWorker'

describe('handleEmailJob', () => {
  beforeEach(() => {
    sendMock.mockReset().mockResolvedValue({ data: { id: 're_123' } })
  })

  it('sends escrow release email via resend with idempotency key', async () => {
    await handleEmailJob({
      type: 'send_release_email',
      data: {
        transactionId: 'escrow_1',
        recipientEmail: 'real@example.com',
        recipientName: 'User',
        partnerName: 'Partner',
        amount: 1000,
      },
    } as any)

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toMatchObject({ idempotencyKey: 'escrow:escrow_1:release' })
  })

  it('supports sendEmail povprasevanje payload contract', async () => {
    await handleEmailJob({
      type: 'sendEmail',
      data: {
        jobType: 'povprasevanje_confirmation',
        povprasevanjeId: 'p_1',
        narocnikEmail: 'customer@example.com',
        title: 'Nova kuhinja',
        location: 'Ljubljana',
      },
    } as any)

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toMatchObject({ idempotencyKey: 'povprasevanje:p_1:confirmation' })
  })

  it('sends refund email via resend with idempotency key', async () => {
    await handleEmailJob({
      type: 'send_refund_email',
      data: {
        transactionId: 'escrow_2',
        recipientEmail: 'real@example.com',
        recipientName: 'User',
        amount: 1000,
        reason: 'Need refund',
      },
    } as any)

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toMatchObject({ idempotencyKey: 'escrow:escrow_2:refund' })
  })

  it('sends dispute email via resend with idempotency key', async () => {
    await handleEmailJob({
      type: 'send_dispute_email',
      data: {
        transactionId: 'escrow_3',
        recipientEmail: 'real@example.com',
        recipientName: 'User',
        reason: 'Bad work',
      },
    } as any)

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toMatchObject({ idempotencyKey: 'escrow:escrow_3:dispute' })
  })

  it('sends payment confirmed email via resend with idempotency key', async () => {
    await handleEmailJob({
      type: 'send_payment_confirmed_email',
      data: {
        transactionId: 'escrow_4',
        recipientEmail: 'real@example.com',
        recipientName: 'User',
        partnerName: 'Partner',
        amount: 1000,
      },
    } as any)

    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0]).toMatchObject({ idempotencyKey: 'escrow:escrow_4:payment_confirmed' })
  })

  it('throws when provider is missing', async () => {
    getEmailProviderMock.mockImplementationOnce(() => { throw new Error('No email provider configured') })
    await expect(
      handleEmailJob({ type: 'send_release_email', data: { transactionId: 't1', recipientEmail: 'a@example.com' } } as any)
    ).rejects.toThrow(/No email provider configured/)
  })

  it('throws for invalid recipient', async () => {
    await expect(
      handleEmailJob({ type: 'send_release_email', data: { transactionId: 't1', recipientEmail: 'invalid' } } as any)
    ).rejects.toThrow(/invalid recipient/)
  })

  it('throws on resend failure for retry', async () => {
    sendMock.mockRejectedValueOnce(new Error('resend down'))
    await expect(
      handleEmailJob({ type: 'send_release_email', data: { transactionId: 't1', recipientEmail: 'a@example.com' } } as any)
    ).rejects.toThrow(/resend down/)
  })

  it('uses distinct idempotency keys for reminder sends', async () => {
    await handleEmailJob({
      type: 'sendEmail',
      data: {
        template: 'marketplace_offer_received',
        ponudbaId: 'offer_55',
        povprasevanjeId: 'p_55',
        to: 'customer@example.com',
        customData: { reminder: '24h' },
      },
    } as any)
    expect(sendMock.mock.calls[0][0]).toMatchObject({ idempotencyKey: 'marketplace_offer_received:offer_55:24h:customer@example.com' })
  })

  it('includes recipient in idempotency key to avoid cross-recipient dedupe', async () => {
    await handleEmailJob({
      type: 'sendEmail',
      data: {
        template: 'marketplace_match_new_request',
        povprasevanjeId: 'p_88',
        to: 'first@example.com',
      },
    } as any)

    await handleEmailJob({
      type: 'sendEmail',
      data: {
        template: 'marketplace_match_new_request',
        povprasevanjeId: 'p_88',
        to: 'second@example.com',
      },
    } as any)

    expect(sendMock.mock.calls[0][0].idempotencyKey).toBe('marketplace_match_new_request:p_88:initial:first@example.com')
    expect(sendMock.mock.calls[1][0].idempotencyKey).toBe('marketplace_match_new_request:p_88:initial:second@example.com')
  })
})
