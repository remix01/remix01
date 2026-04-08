import { calculateCommission, centsToEur, eurToCents } from '@/lib/commission/calculator'

describe('commission calculator', () => {
  it('calculates START tier commission', () => {
    const result = calculateCommission({ grossAmountEur: 1000, tier: 'start' })
    expect(result.commissionEur).toBe('100.00')
    expect(result.netPayoutEur).toBe('900.00')
    expect(result.capApplied).toBe(false)
  })

  it('applies 500 EUR cap on START tier', () => {
    const result = calculateCommission({ grossAmountEur: 10000, tier: 'start' })
    expect(result.commissionEur).toBe('500.00')
    expect(result.netPayoutEur).toBe('9500.00')
    expect(result.capApplied).toBe(true)
  })

  it('calculates PRO tier commission', () => {
    const result = calculateCommission({ grossAmountEur: 2000, tier: 'pro' })
    expect(result.commissionEur).toBe('100.00')
    expect(result.netPayoutEur).toBe('1900.00')
  })

  it('returns zero commission for ELITE', () => {
    const result = calculateCommission({ grossAmountEur: 50000, tier: 'elite' })
    expect(result.commissionEur).toBe('0.00')
    expect(result.netPayoutEur).toBe('50000.00')
    expect(result.capApplied).toBe(false)
  })

  it('handles precision in cents', () => {
    const result = calculateCommission({ grossAmountEur: 99.99, tier: 'start' })
    expect(result.grossAmountCents).toBe(9999)
    expect(result.commissionCents).toBe(1000)
    expect(result.netPayoutCents).toBe(8999)
    expect(result.grossAmountCents).toBe(result.commissionCents + result.netPayoutCents)
  })

  it('throws on negative amount', () => {
    expect(() => calculateCommission({ grossAmountEur: -1, tier: 'start' })).toThrow(
      'Gross amount cannot be negative'
    )
  })

  it('eur/cents helper conversions are stable', () => {
    expect(eurToCents(10.1)).toBe(1010)
    expect(centsToEur(1010)).toBe('10.10')
  })
})
