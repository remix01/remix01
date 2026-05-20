import './setup'

import { updateEscrowStatus } from '@/lib/escrow'
import { POST as stripeWebhookPost } from '@/app/api/webhooks/stripe/route'

const mockAssertEnv = jest.fn()
const mockConstructStripeEvent = jest.fn()
const mockClaimStripeEventProcessing = jest.fn()
const mockReleaseStripeEventClaim = jest.fn()

let mockCurrentStatus: string = 'pending'
const mockUpdateSelect = jest.fn()
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

jest.mock('@/lib/stripe/eventProcessing', () => ({
  claimStripeEventProcessing: (...args: unknown[]) => mockClaimStripeEventProcessing(...args),
  releaseStripeEventClaim: (...args: unknown[]) => mockReleaseStripeEventClaim(...args),
}))

jest.mock('@/lib/stripe/handlers', () => ({
  stripeWebhookHandlers: {
    'payment_intent.succeeded': jest.fn().mockResolvedValue(undefined),
    'charge.refunded': jest.fn().mockResolvedValue(undefined),
  },
}))

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
            eq: () => ({
              eq: () => ({
                select: () => mockUpdateSelect(),
              }),
            }),
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
    mockUpdateSelect.mockReset()
    mockUpdateSelect.mockResolvedValue({ data: [{ id: 'tx_1' }], error: null })
    mockAuditInsert.mockClear()
    mockAssertEnv.mockClear()
    mockConstructStripeEvent.mockReset()
    mockClaimStripeEventProcessing.mockReset()
    mockReleaseStripeEventClaim.mockReset()
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

    expect(mockUpdateSelect).not.toHaveBeenCalled()
  })

  it('allows refund flow transition paid -> refunded', async () => {
    mockCurrentStatus = 'paid'

    await updateEscrowStatus({
      transactionId: 'tx_1',
      newStatus: 'refunded',
      actor: 'admin',
      actorId: 'admin_1',
    })

    expect(mockUpdateSelect).toHaveBeenCalledTimes(1)
    expect(mockAuditInsert).toHaveBeenCalledTimes(1)
  })

  it('handles duplicate webhook event idempotently (claim rejected)', async () => {
    mockConstructStripeEvent.mockReturnValue({ id: 'evt_dup_1', type: 'payment_intent.succeeded' })
    mockClaimStripeEventProcessing.mockResolvedValue(false)

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

  it('processes first webhook event when claim succeeds', async () => {
    mockConstructStripeEvent.mockReturnValue({ id: 'evt_new_1', type: 'payment_intent.succeeded' })
    mockClaimStripeEventProcessing.mockResolvedValue(true)

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
    expect(body.data.received).toBe(true)
    expect(body.data.skipped).toBeUndefined()
  })

  it('ignores unsupported event types without claiming', async () => {
    mockConstructStripeEvent.mockReturnValue({ id: 'evt_unknown', type: 'some.unknown.event' })

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
    expect(body.data.ignored).toBe(true)
    expect(mockClaimStripeEventProcessing).not.toHaveBeenCalled()
  })

  it('releases claim on handler failure for retry', async () => {
    const { stripeWebhookHandlers } = require('@/lib/stripe/handlers')
    stripeWebhookHandlers['payment_intent.succeeded'].mockRejectedValueOnce(new Error('transient DB error'))
    mockConstructStripeEvent.mockReturnValue({ id: 'evt_fail_1', type: 'payment_intent.succeeded' })
    mockClaimStripeEventProcessing.mockResolvedValue(true)
    mockReleaseStripeEventClaim.mockResolvedValue(undefined)

    const req = new Request('http://localhost/api/webhooks/stripe', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'sig',
      },
      body: JSON.stringify({ test: true }),
    })

    const response = await stripeWebhookPost(req as any)

    expect(response.status).toBe(400)
    expect(mockReleaseStripeEventClaim).toHaveBeenCalledWith('evt_fail_1')
  })

  it('no-ops same-status transition (paid -> paid)', async () => {
    mockCurrentStatus = 'paid'

    await updateEscrowStatus({
      transactionId: 'tx_1',
      newStatus: 'paid',
      actor: 'system',
    })

    expect(mockUpdateSelect).toHaveBeenCalledTimes(1)
  })
})
