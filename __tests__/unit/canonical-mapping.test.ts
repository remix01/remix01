import {
  normalizeActorRole,
  normalizeLeadStatus,
  normalizePaymentStatus,
} from '@/lib/domain/canonical-mapping'

describe('canonical mapping helpers', () => {
  it('normalizes known lead statuses', () => {
    expect(normalizeLeadStatus('novo')).toBe('new')
    expect(normalizeLeadStatus('odprto')).toBe('new')
    expect(normalizeLeadStatus('dodeljeno')).toBe('matched')
    expect(normalizeLeadStatus('v_teku')).toBe('in_progress')
    expect(normalizeLeadStatus('zaključeno')).toBe('completed')
  })

  it('normalizes known payment statuses', () => {
    expect(normalizePaymentStatus('UNPAID')).toBe('pending')
    expect(normalizePaymentStatus('HELD')).toBe('captured')
    expect(normalizePaymentStatus('RELEASED')).toBe('released')
    expect(normalizePaymentStatus('REFUNDED')).toBe('refunded')
    expect(normalizePaymentStatus('DISPUTED')).toBe('disputed')
  })

  it('normalizes known actor roles', () => {
    expect(normalizeActorRole('CUSTOMER')).toBe('customer')
    expect(normalizeActorRole('CRAFTWORKER')).toBe('provider')
    expect(normalizeActorRole('ADMIN')).toBe('admin')
  })
})
