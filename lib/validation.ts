/**
 * Centralized input validation utilities
 * Used across all API routes for consistent validation
 */

export interface ValidationError {
  field: string
  message: string
}

export interface ValidationResult {
  valid: boolean
  errors: ValidationError[]
}

// Email regex pattern
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Validate email format
 */
export function validateEmail(email: string | undefined): ValidationError | null {
  if (!email) {
    return { field: 'email', message: 'Email is required' }
  }

  if (typeof email !== 'string') {
    return { field: 'email', message: 'Email must be a string' }
  }

  if (!EMAIL_REGEX.test(email)) {
    return { field: 'email', message: 'Invalid email format' }
  }

  return null
}

/**
 * Validate UUID format
 */
export function validateUUID(uuid: string | undefined, fieldName: string = 'id'): ValidationError | null {
  if (!uuid) {
    return { field: fieldName, message: `${fieldName} is required` }
  }

  if (typeof uuid !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` }
  }

  if (!UUID_REGEX.test(uuid)) {
    return { field: fieldName, message: `Invalid ${fieldName} format` }
  }

  return null
}

/**
 * Validate positive amount/price (in cents or smallest unit)
 */
export function validateAmount(amount: any, fieldName: string = 'amount', minCents: number = 100): ValidationError | null {
  if (amount === undefined || amount === null) {
    return { field: fieldName, message: `${fieldName} is required` }
  }

  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount

  if (isNaN(numAmount)) {
    return { field: fieldName, message: `${fieldName} must be a valid number` }
  }

  if (numAmount <= 0) {
    return { field: fieldName, message: `${fieldName} must be positive` }
  }

  if (numAmount < minCents) {
    const euros = (minCents / 100).toFixed(2)
    return { field: fieldName, message: `${fieldName} must be at least €${euros}` }
  }

  // Max 1M EUR (100M cents)
  if (numAmount > 100_000_000) {
    return { field: fieldName, message: `${fieldName} exceeds maximum allowed amount` }
  }

  return null
}

/**
 * Validate string length
 */
export function validateStringLength(
  value: string | undefined,
  fieldName: string,
  minLength: number = 1,
  maxLength: number = 5000
): ValidationError | null {
  if (!value) {
    return { field: fieldName, message: `${fieldName} is required` }
  }

  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` }
  }

  const trimmed = value.trim()

  if (trimmed.length < minLength) {
    return { field: fieldName, message: `${fieldName} must be at least ${minLength} characters` }
  }

  if (trimmed.length > maxLength) {
    return { field: fieldName, message: `${fieldName} must be at most ${maxLength} characters` }
  }

  return null
}

/**
 * Validate required string field
 */
export function validateRequiredString(value: any, fieldName: string): ValidationError | null {
  if (!value) {
    return { field: fieldName, message: `${fieldName} is required` }
  }

  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` }
  }

  return null
}

/**
 * Validate enum value
 */
export function validateEnum(value: any, fieldName: string, allowedValues: string[]): ValidationError | null {
  if (!value) {
    return { field: fieldName, message: `${fieldName} is required` }
  }

  if (!allowedValues.includes(value)) {
    return { field: fieldName, message: `${fieldName} must be one of: ${allowedValues.join(', ')}` }
  }

  return null
}

/**
 * Collect all validation errors
 */
export function collectErrors(...errors: (ValidationError | null)[]): ValidationError[] {
  return errors.filter((e): e is ValidationError => e !== null)
}
