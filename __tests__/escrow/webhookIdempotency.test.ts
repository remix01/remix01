import './setup'

import { POST as deprecatedWebhookPost } from '@/app/api/payments/webhook/route'
import { applyStripePaymentEvent } from '@/lib/services/paymentStateService'

let mockEscrowData: Record<string, unknown> | null = null
const mockUpdateSelect = jest.fn()
const mockAuditInsert = jest.fn().mockResolvedValue({ error: null })

jest.mock('@/lib/supabase-admin', () => ({
  supabaseAdmin: {
    from: (table: string) => {
      if (table === 'escrow_transactions') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: mockEscrowData,
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
        return { insert: mockAuditInsert }
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

describe('Deprecated webhook route (/api/payments/webhook)', () => {
  it('returns 410 with signature header', async () => {
    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'stripe-signature': 'test_sig',
      },
      body: JSON.stringify({ id: 'evt_1' }),
    })

    const response = await deprecatedWebhookPost(req as any)
    expect(response.status).toBe(410)

    const body = await response.json()
    expect(body.canonicalEndpoint).toBe('/api/webhooks/stripe')
  })

  it('returns 410 without signature header', async () => {
    const req = new Request('http://localhost/api/payments/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'evt_2' }),
    })

    const response = await deprecatedWebhookPost(req as any)
    expect(response.status).toBe(410)
  })
})

describe('applyStripePaymentEvent idempotency', () => {
  beforeEach(() => {
    mockEscrowData = null
    mockUpdateSelect.mockReset()
    mockUpdateSelect.mockResolvedValue({ data: [{ id: 'tx_1' }], error: null })
    mockAuditInsert.mockClear()
  })

  it('skips when no local escrow exists for payment intent', async () => {
    mockEscrowData = null

    const result = await applyStripePaymentEvent({
      stripeEvent: { id: 'evt_orphan', type: 'payment_intent.succeeded' },
      paymentIntentId: 'pi_unknown',
      eventKind: 'payment_succeeded',
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('missing_local_payment')
    expect(mockUpdateSelect).not.toHaveBeenCalled()
  })

  it('skips duplicate payment_succeeded when already paid', async () => {
    mockEscrowData = { id: 'tx_1', status: 'paid', amount_total_cents: 10000 }

    const result = await applyStripePaymentEvent({
      stripeEvent: { id: 'evt_dup_paid', type: 'payment_intent.succeeded' },
      paymentIntentId: 'pi_1',
      eventKind: 'payment_succeeded',
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('state_guard_skip')
    expect(mockUpdateSelect).not.toHaveBeenCalled()
  })

  it('skips charge_refunded when already refunded', async () => {
    mockEscrowData = { id: 'tx_1', status: 'refunded', amount_total_cents: 10000 }

    const result = await applyStripePaymentEvent({
      stripeEvent: { id: 'evt_dup_refund', type: 'charge.refunded' },
      paymentIntentId: 'pi_1',
      eventKind: 'charge_refunded',
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('state_guard_skip')
  })

  it('skips transfer_created when already released', async () => {
    mockEscrowData = { id: 'tx_1', status: 'released', amount_total_cents: 10000 }

    const result = await applyStripePaymentEvent({
      stripeEvent: { id: 'evt_dup_transfer', type: 'transfer.created' },
      paymentIntentId: 'pi_1',
      eventKind: 'transfer_created',
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('state_guard_skip')
  })

  it('applies payment_succeeded on pending escrow', async () => {
    mockEscrowData = { id: 'tx_1', status: 'pending', amount_total_cents: 10000 }

    const result = await applyStripePaymentEvent({
      stripeEvent: { id: 'evt_pay_1', type: 'payment_intent.succeeded' },
      paymentIntentId: 'pi_1',
      eventKind: 'payment_succeeded',
      extraFields: { paid_at: '2026-01-01T00:00:00Z' },
    })

    expect(result.applied).toBe(true)
    expect(mockUpdateSelect).toHaveBeenCalledTimes(1)
  })

  it('applies charge_refunded on paid escrow', async () => {
    mockEscrowData = { id: 'tx_1', status: 'paid', amount_total_cents: 10000 }

    const result = await applyStripePaymentEvent({
      stripeEvent: { id: 'evt_refund_1', type: 'charge.refunded' },
      paymentIntentId: 'pi_1',
      eventKind: 'charge_refunded',
    })

    expect(result.applied).toBe(true)
  })

  it('rejects refund on already-released escrow', async () => {
    mockEscrowData = { id: 'tx_1', status: 'released', amount_total_cents: 10000 }

    const result = await applyStripePaymentEvent({
      stripeEvent: { id: 'evt_refund_late', type: 'charge.refunded' },
      paymentIntentId: 'pi_1',
      eventKind: 'charge_refunded',
    })

    expect(result.applied).toBe(false)
    expect(result.reason).toBe('state_guard_skip')
  })
})
