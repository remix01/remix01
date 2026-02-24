/**
 * Amount Guard - Validates financial amounts
 * Ensures amounts are positive, reasonable, and have correct decimal places
 */

/**
 * Check if any amount fields in params are valid
 * - Must be > 0
 * - Must be < 1,000,000 (1M)
 * - Must have max 2 decimal places
 * Throws 400 if validation fails
 */
export async function amountGuard(params: unknown): Promise<void> {
  if (typeof params !== 'object' || params === null) {
    return // No amount fields to check
  }

  const obj = params as Record<string, any>

  // Find all amount-like fields
  const amountFields = ['amount', 'price', 'price_estimate', 'amountCents', 'priceEstimate']

  for (const field of amountFields) {
    const value = obj[field]

    if (value === undefined || value === null) {
      continue // Field not present, skip
    }

    const amount = Number(value)

    // Check if valid number
    if (isNaN(amount)) {
      throw {
        success: false,
        error: `Invalid amount: ${field} must be a number`,
        code: 400,
      }
    }

    // Check if positive
    if (amount <= 0) {
      throw {
        success: false,
        error: `Invalid amount: ${field} must be greater than 0`,
        code: 400,
      }
    }

    // Check if within bounds (1M EUR max)
    if (amount > 1_000_000) {
      throw {
        success: false,
        error: `Invalid amount: ${field} exceeds maximum of 1,000,000`,
        code: 400,
      }
    }

    // Check decimal places (max 2 for cents)
    const decimalPlaces = (String(amount).split('.')[1] || '').length
    if (decimalPlaces > 2) {
      throw {
        success: false,
        error: `Invalid amount: ${field} must have maximum 2 decimal places`,
        code: 400,
      }
    }
  }
}
