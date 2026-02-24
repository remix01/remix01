/**
 * Main Guardrails Orchestrator
 * Runs all guards in sequence before tool execution
 * Fails fast on first guard failure
 */

import { schemaGuard } from './schemaGuard'
import { injectionGuard } from './injectionGuard'
import { amountGuard } from './amountGuard'
import { rateGuard } from './rateGuard'

export interface GuardError {
  success: false
  error: string
  code: number
}

export interface Session {
  user: {
    id: string
    email?: string
  }
}

/**
 * Run all guardrails on tool call
 * Throws GuardError if any guard fails
 * Pure function - no side effects beyond rate limit tracking
 */
export async function runGuardrails(
  toolName: string,
  params: unknown,
  session: Session
): Promise<void> {
  // 1. Validate schema
  await schemaGuard(toolName, params)

  // 2. Check for injection attempts
  await injectionGuard(params)

  // 3. Validate financial amounts
  await amountGuard(params)

  // 4. Check rate limits
  await rateGuard(session.user.id)
}

/**
 * Middleware wrapper for API handlers
 * Use this to wrap route handlers that accept tool calls
 */
export function withGuardrails(
  handler: (toolName: string, params: unknown, session: Session) => Promise<any>
) {
  return async (toolName: string, params: unknown, session: Session) => {
    try {
      // Run all guardrails
      await runGuardrails(toolName, params, session)

      // If all guardrails pass, proceed to handler
      return await handler(toolName, params, session)
    } catch (error: any) {
      // Re-throw guard errors as-is
      if (error.code && error.success === false) {
        throw error
      }

      // Wrap unexpected errors
      throw {
        success: false,
        error: 'Internal server error',
        code: 500,
      }
    }
  }
}

/**
 * Utility to create a guard error response
 */
export function createGuardError(error: string, code: number = 400): GuardError {
  return {
    success: false,
    error,
    code,
  }
}
