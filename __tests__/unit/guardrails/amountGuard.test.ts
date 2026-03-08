import { describe, it, expect } from '@jest/globals'
import { amountGuard } from '@/lib/agent/guardrails/amountGuard'

describe('AmountGuard', () => {
  describe('valid amounts', () => {
    it('allows valid amount: 100', async () => {
      await expect(amountGuard({ amount: 100 })).resolves.toBeUndefined()
    })

    it('allows valid amount: 0.01', async () => {
      await expect(amountGuard({ amount: 0.01 })).resolves.toBeUndefined()
    })

    it('allows valid amount: 1', async () => {
      await expect(amountGuard({ amount: 1 })).resolves.toBeUndefined()
    })

    it('allows valid amount: 999999.99', async () => {
      await expect(amountGuard({ amount: 999999.99 })).resolves.toBeUndefined()
    })

    it('allows valid amount: 50000', async () => {
      await expect(amountGuard({ amount: 50000 })).resolves.toBeUndefined()
    })

    it('allows price field', async () => {
      await expect(amountGuard({ price: 250.75 })).resolves.toBeUndefined()
    })

    it('allows price_estimate field', async () => {
      await expect(amountGuard({ price_estimate: 500 })).resolves.toBeUndefined()
    })

    it('allows amountCents field', async () => {
      await expect(amountGuard({ amountCents: 10000 })).resolves.toBeUndefined()
    })

    it('allows priceEstimate field', async () => {
      await expect(amountGuard({ priceEstimate: 1500.5 })).resolves.toBeUndefined()
    })

    it('allows multiple amount fields if all valid', async () => {
      await expect(
        amountGuard({
          amount: 100,
          price: 50.25,
          priceEstimate: 75.99,
        })
      ).resolves.toBeUndefined()
    })
  })

  describe('invalid amounts', () => {
    it('rejects amount: 0', async () => {
      await expect(amountGuard({ amount: 0 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects amount: -1', async () => {
      await expect(amountGuard({ amount: -1 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects amount: -0.01', async () => {
      await expect(amountGuard({ amount: -0.01 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects amount: -100', async () => {
      await expect(amountGuard({ amount: -100 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects amount: 1000001', async () => {
      await expect(amountGuard({ amount: 1000001 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects amount: 5000000', async () => {
      await expect(amountGuard({ amount: 5000000 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects amount with 3 decimal places: 10.001', async () => {
      await expect(amountGuard({ amount: 10.001 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects amount with 4 decimal places: 10.0001', async () => {
      await expect(amountGuard({ amount: 10.0001 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects NaN', async () => {
      await expect(amountGuard({ amount: NaN })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects Infinity', async () => {
      await expect(amountGuard({ amount: Infinity })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects negative Infinity', async () => {
      await expect(amountGuard({ amount: -Infinity })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects string disguised as number: "100abc"', async () => {
      await expect(amountGuard({ amount: '100abc' })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects pure string: "abc"', async () => {
      await expect(amountGuard({ amount: 'abc' })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects boolean true', async () => {
      await expect(amountGuard({ amount: true })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('rejects boolean false', async () => {
      await expect(amountGuard({ amount: false })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })
  })

  describe('edge cases', () => {
    it('passes when no amount field present in params', async () => {
      await expect(amountGuard({ title: 'Test', description: 'No amount' })).resolves.toBeUndefined()
    })

    it('passes when amount field is null', async () => {
      await expect(amountGuard({ amount: null })).resolves.toBeUndefined()
    })

    it('passes when amount field is undefined', async () => {
      await expect(amountGuard({ amount: undefined })).resolves.toBeUndefined()
    })

    it('passes when params is not an object', async () => {
      await expect(amountGuard(null)).resolves.toBeUndefined()
    })

    it('passes when params is a string', async () => {
      await expect(amountGuard('not an object')).resolves.toBeUndefined()
    })

    it('passes when params is a number', async () => {
      await expect(amountGuard(123)).resolves.toBeUndefined()
    })

    it('handles boundary case: 0.01 (minimum valid)', async () => {
      await expect(amountGuard({ amount: 0.01 })).resolves.toBeUndefined()
    })

    it('handles boundary case: 1000000 (max valid)', async () => {
      await expect(amountGuard({ amount: 1000000 })).resolves.toBeUndefined()
    })

    it('rejects just over max: 1000000.01', async () => {
      await expect(amountGuard({ amount: 1000000.01 })).rejects.toEqual(
        expect.objectContaining({ code: 400 })
      )
    })

    it('checks first invalid amount field and stops', async () => {
      await expect(
        amountGuard({
          amount: 100,
          price: -50, // This should fail
          priceEstimate: 999999.99,
        })
      ).rejects.toEqual(expect.objectContaining({ code: 400 }))
    })

    it('handles number expressed as string-number correctly', async () => {
      // String "100" can be coerced to number
      const numberString = Number('100')
      await expect(amountGuard({ amount: numberString })).resolves.toBeUndefined()
    })

    it('very small valid decimal: 0.01', async () => {
      await expect(amountGuard({ amount: 0.01 })).resolves.toBeUndefined()
    })

    it('very large valid amount: 999999.99', async () => {
      await expect(amountGuard({ amount: 999999.99 })).resolves.toBeUndefined()
    })
  })
})
