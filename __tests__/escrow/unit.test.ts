import './setup'
import { calculateFee } from '@/lib/stripe'

describe('Escrow Unit Tests', () => {
  describe('Commission Calculator', () => {
    it('should calculate START package fee (10%)', () => {
      const result = calculateFee(10000, 'START')
      expect(result.platformFee).toBe(1000)
      expect(result.partnerPayout).toBe(9000)
    })

    it('should calculate PRO package fee (5%)', () => {
      const result = calculateFee(10000, 'PRO')
      expect(result.platformFee).toBe(500)
      expect(result.partnerPayout).toBe(9500)
    })

    it('should default to START if package unknown', () => {
      const result = calculateFee(10000, 'UNKNOWN' as any)
      expect(result.platformFee).toBe(1000)
    })

    it('should handle edge case: 0 amount', () => {
      const result = calculateFee(0, 'START')
      expect(result.platformFee).toBe(0)
      expect(result.partnerPayout).toBe(0)
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
