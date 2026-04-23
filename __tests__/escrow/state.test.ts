import './setup'

import { updateEscrowStatus } from '@/lib/escrow'
import { POST as stripeWebhookPost } from '@/app/api/webhooks/stripe/route'

const mockAssertEnv = jest.fn()
const mockConstructStripeEvent = jest.fn()
const mockIsStripeEventProcessed = jest.fn()

let mockCurrentStatus: string = 'pending'
const mockUpdateEq = jest.fn().mockResolvedValue({ error: null })
const mockAuditInsert = jest.fn().mockResolvedValue({ error: null })

jest.mock('@/lib/env', () => {
  const actual = jest.requireActual('@/lib/env')
  return {
    ...actual,
    assertEnv: () => mockAssertEnv(),
  }
})

jest.mock('@/lib/stripe', () => ({
  constructStripeEvent: (...args: unknown[]) => mockConstructStripeEvent(...args),
}))

jest.mock('@/lib/escrow', () => {
  const actual = jest.requireActual('@/lib/escrow')
  return {
    ...actual,
    isStripeEventProcessed: (...args: unknown[]) => mockIsStripeEventProcessed(...args),
  }
})

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'escrow_transactions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: 'tx_1',
                  status: mockCurrentStatus,
                  amount_total_cents: 10000,
                },
                error: null,
              }),
            }),
          }),
          update: () => ({
            eq: mockUpdateEq,
          }),
        }
      }

      if (table === 'escrow_audit_log') {
        return {
          insert: mockAuditInsert,
        }
      }

      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
      }
    },
  },
}))

describe('Escrow state + webhook idempotency', () => {
  beforeEach(() => {
    mockCurrentStatus = 'pending'
    mockUpdateEq.mockClear()
    mockAuditInsert.mockClear()
    mockAssertEnv.mockClear()
    mockConstructStripeEvent.mockReset()
    mockIsStripeEventProcessed.mockReset()
  })

  it('rejects invalid escrow transition', async () => {
    mockCurrentStatus = 'released'

    await expect(
      updateEscrowStatus({
        transactionId: 'tx_1',
        newStatus: 'paid',
        actor: 'system',
      })
    ).rejects.toThrow('Invalid transition')

    expect(mockUpdateEq).not.toHaveBeenCalled()
  })

  it('allows refund flow transition paid -> refunded', async () => {
    mockCurrentStatus = 'paid'

    await updateEscrowStatus({
      transactionId: 'tx_1',
      newStatus: 'refunded',
      actor: 'admin',
      actorId: 'admin_1',
    })

    expect(mockUpdateEq).toHaveBeenCalledTimes(1)
    expect(mockAuditInsert).toHaveBeenCalledTimes(1)
  })

  it('handles duplicate webhook event idempotently', async () => {
    mockConstructStripeEvent.mockReturnValue({ id: 'evt_dup_1', type: 'payment_intent.succeeded' })
    mockIsStripeEventProcessed.mockResolvedValue(true)

    const req = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'sig',
      },
      body: JSON.stringify({ test: true }),
    })

    const response = await stripeWebhookPost(req as any)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.data.skipped).toBe(true)
  })
})
