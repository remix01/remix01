/**
 * Main Guardrails Orchestrator
 * Runs all guards in sequence before tool execution
 * Fails fast on first guard failure
 * 
 * Guard Execution Order (each guard runs after auth):
 * 1. PERMISSIONS (role-based + ownership) — first line of defense
 * 2. SCHEMA validation — prevents malformed requests
 * 3. INJECTION detection — prevents attack payloads
 * 4. AMOUNT validation — prevents financial errors
 * 5. RATE LIMIT — prevents abuse
 */

import { schemaGuard } from './schemaGuard'
import { injectionGuard } from './injectionGuard'
import { amountGuard } from './amountGuard'
import { rateGuard } from './rateGuard'
import { checkPermission, type Role } from '../permissions'
import { agentLogger } from '@/lib/observability'

export interface GuardError {
  success: false
  error: string
  code: number
}

export interface Session {
  user: {
    id: string
    email?: string
    role: Role
  }
}

/**
 * Run all guardrails on tool call
 * Throws GuardError if any guard fails
 * Pure function - no side effects beyond rate limit tracking
 * 
 * Order matters: PERMISSIONS first, then other security checks
 */
export async function runGuardrails(
  toolName: string,
  params: unknown,
  session: Session
): Promise<void> {
  const sessionId = (session as any).sessionId ?? 'unknown'
  const userId = session.user.id

  // 1. Check PERMISSIONS first (role-based + ownership)
  const permissionResult = await checkPermission(toolName, params, session)
  if (!permissionResult.allowed) {
    agentLogger.logGuardrailRejection(sessionId, userId, toolName, 'permission')
    throw {
      success: false,
      error: permissionResult.error || 'Forbidden',
      code: permissionResult.code || 403,
    }
  }

  // 2. Validate schema
  try {
    await schemaGuard(toolName, params)
  } catch (e: any) {
    agentLogger.logGuardrailRejection(sessionId, userId, toolName, `schema: ${e.error ?? e.message}`)
    throw e
  }

  // 3. Check for injection attempts
  try {
    await injectionGuard(params)
  } catch (e: any) {
    agentLogger.logInjectionAttempt(sessionId, userId, 'injection_pattern_detected')
    throw e
  }

  // 4. Validate financial amounts
  try {
    await amountGuard(params)
  } catch (e: any) {
    agentLogger.logGuardrailRejection(sessionId, userId, toolName, `amount: ${e.error ?? e.message}`)
    throw e
  }

  // 5. Check rate limits
  try {
    await rateGuard(session.user.id)
  } catch (e: any) {
    agentLogger.logRateLimit(sessionId, userId)
    throw e
  }
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
