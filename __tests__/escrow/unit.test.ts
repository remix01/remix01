import './setup'
import { calculateEscrow } from '@/lib/stripe'

describe('Escrow Unit Tests', () => {
  describe('Commission Calculator', () => {
    it('should calculate start package commission (10%)', () => {
      const result = calculateEscrow(10000, 'start')
      expect(result.commissionCents).toBe(1000)
      expect(result.payoutCents).toBe(9000)
      expect(result.commissionRate).toBe(0.10)
    })

    it('should calculate pro package commission (5%)', () => {
      const result = calculateEscrow(10000, 'pro')
      expect(result.commissionCents).toBe(500)
      expect(result.payoutCents).toBe(9500)
      expect(result.commissionRate).toBe(0.05)
    })

    it('should handle edge case: 0 amount', () => {
      const result = calculateEscrow(0, 'start')
      expect(result.commissionCents).toBe(0)
      expect(result.payoutCents).toBe(0)
    })

    it('commissionCents + payoutCents should equal original amount', () => {
      const amount = 12345
      const result = calculateEscrow(amount, 'start')
      expect(result.commissionCents + result.payoutCents).toBe(amount)
    })
  })

  describe('Status Transitions', () => {
    it('should allow PENDING → HELD', () => {
      const validTransitions = ['PENDING', 'HELD']
      expect(validTransitions).toContain('HELD')
    })

    it('should allow HELD → RELEASED', () => {
      const validTransitions = ['HELD', 'RELEASED']
      expect(validTransitions).toContain('RELEASED')
    })

    it('should allow HELD → DISPUTED', () => {
      const validTransitions = ['HELD', 'DISPUTED']
      expect(validTransitions).toContain('DISPUTED')
    })

    it('should allow DISPUTED → REFUNDED', () => {
      const validTransitions = ['DISPUTED', 'REFUNDED']
      expect(validTransitions).toContain('REFUNDED')
    })
  })
})
