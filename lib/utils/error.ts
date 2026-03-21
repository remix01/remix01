/** Structured error object thrown by escrow state machine and agent tools. */
export interface StructuredError {
  code: number
  error: string
  success?: false
}

/** Type guard for StructuredError (thrown by state machine, agent tools, etc.) */
export function isStructuredError(error: unknown): error is StructuredError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'number' &&
    'error' in error &&
    typeof (error as Record<string, unknown>).error === 'string'
  )
}

/**
 * Extracts a human-readable message from an unknown error value.
 * Replaces `catch (error: any)` + `error.message` patterns throughout the codebase.
 */
export function getErrorMessage(error: unknown, fallback = 'Internal error'): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  ) {
    return (error as Record<string, unknown>).message as string
  }
  return fallback
}
