import { shouldSkipEventForCurrentStatus, targetStatusForEvent } from '@/lib/state-machine/paymentStatus'

describe('payment state machine guards', () => {
  test('duplicate webhook event', () => {
    expect(shouldSkipEventForCurrentStatus('paid', 'paid')).toBe(true)
  })

  test('out-of-order webhook event', () => {
    expect(shouldSkipEventForCurrentStatus('released', targetStatusForEvent('payment_succeeded'))).toBe(true)
  })

  test('dispute after capture', () => {
    expect(shouldSkipEventForCurrentStatus('paid', targetStatusForEvent('dispute_opened'))).toBe(false)
  })

  test('failed payment after pending', () => {
    expect(shouldSkipEventForCurrentStatus('pending', targetStatusForEvent('payment_failed'))).toBe(false)
  })

  test('reconciliation correcting stale local status', () => {
    expect(shouldSkipEventForCurrentStatus('pending', targetStatusForEvent('payment_succeeded'))).toBe(false)
  })
})
