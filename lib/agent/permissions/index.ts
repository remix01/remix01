/**
 * Main Permission Layer
 * Combines role-based and ownership-based access control
 * Runs after Guardrails, before Backend API
 */

import { canAccess, Role } from './roles'
import { assertOwnership, OwnershipError } from './ownership'
import { agentLogger } from '@/lib/observability'
import { anomalyDetector } from '@/lib/observability/alerting'

export interface Session {
  user: {
    id: string
    email?: string
    role: Role
  }
}

export interface PermissionCheckResult {
  allowed: boolean
  error?: string
  code?: number
}

/**
 * Tool permission requirements registry
 * Maps tool name to required role and affected resource IDs
 */
export const toolRegistry: Record<string, {
  requiredRole: Role
  ownershipChecks?: Array<{
    resource: 'inquiry' | 'offer' | 'escrow'
    paramKey: string
  }>
}> = {
  // Escrow tools
  'escrow.create': {
    requiredRole: 'user',
  },
  'escrow.release': {
    requiredRole: 'partner',
    ownershipChecks: [{ resource: 'escrow', paramKey: 'escrowId' }],
  },
  'escrow.dispute': {
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'escrow', paramKey: 'escrowId' }],
  },
  'escrow.getAudit': {
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'escrow', paramKey: 'transactionId' }],
  },

  // Inquiry tools
  'inquiry.list': {
    requiredRole: 'user',
  },
  'inquiry.get': {
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'inquiry', paramKey: 'inquiryId' }],
  },
  'inquiry.create': {
    requiredRole: 'guest', // Inquiries can be created by anyone
  },

  // Offer tools
  'offer.list': {
    requiredRole: 'user',
  },
  'offer.get': {
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'offer', paramKey: 'offerId' }],
  },
  'offer.create': {
    requiredRole: 'partner',
  },
  'offer.accept': {
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'offer', paramKey: 'offerId' }],
  },
  'offer.reject': {
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'offer', paramKey: 'offerId' }],
  },
}

/**
 * Check if a tool call is permitted for the given session and parameters
 * Performs both role-based and ownership-based checks
 *
 * @param toolName Name of the tool being called
 * @param params Parameters passed to the tool (may contain resource IDs)
 * @param session User session with role information
 * @returns Permission check result
 *
 * @throws Error if permission check fails
 */
export async function checkPermission(
  toolName: string,
  params: Record<string, any>,
  session: Session
): Promise<PermissionCheckResult> {
  try {
    // 1. Check if tool exists in registry
    const toolPermission = toolRegistry[toolName]
    if (!toolPermission) {
      console.warn(`[PERMISSION] Unknown tool: ${toolName}`)
      return {
        allowed: false,
        error: 'Forbidden',
        code: 403,
      }
    }

    // 2. Role-based access check
    if (!canAccess(session.user.role, toolPermission.requiredRole)) {
      agentLogger.logPermissionDenied(
        'unknown',
        session.user.id,
        toolName,
        toolPermission.requiredRole,
        session.user.role
      )
      
      // Record permission denial for anomaly detection (non-blocking)
      anomalyDetector.record('repeated_permission_denials', session.user.id)
      
      return {
        allowed: false,
        error: 'Forbidden',
        code: 403,
      }
    }

    // 3. Ownership-based checks (if applicable)
    if (toolPermission.ownershipChecks && toolPermission.ownershipChecks.length > 0) {
      for (const check of toolPermission.ownershipChecks) {
        const resourceId = params[check.paramKey]
        if (!resourceId) {
          continue // Skip if param not provided
        }

        try {
          await assertOwnership(check.resource, resourceId, session.user.id, session.user.role)
        } catch (error) {
          if (error instanceof OwnershipError) {
            agentLogger.logPermissionDenied(
              'unknown',
              session.user.id,
              toolName,
              `owns:${check.resource}`,
              session.user.role
            )
            
            // Record ownership violation for anomaly detection (non-blocking)
            anomalyDetector.record('repeated_permission_denials', session.user.id)
            
            return {
              allowed: false,
              error: 'Forbidden',
              code: 403,
            }
          }
          throw error
        }
      }
    }

    // 4. All checks passed
    return {
      allowed: true,
    }
  } catch (error) {
    console.error('[PERMISSION] Unexpected error during permission check:', error)
    return {
      allowed: false,
      error: 'Forbidden',
      code: 403,
    }
  }
}

/**
 * Middleware to enforce permissions before API calls
 * Usage: wrap your API handler with this middleware
 */
export function withPermissionCheck(
  requiredRole: Role,
  ownershipResource?: 'inquiry' | 'offer' | 'escrow',
  ownershipParamKey?: string
) {
  return async (
    req: any,
    session: Session,
    params: Record<string, any>
  ): Promise<{ allowed: boolean; error?: string; code?: number }> => {
    // Role check
    if (!canAccess(session.user.role, requiredRole)) {
      return {
        allowed: false,
        error: 'Forbidden',
        code: 403,
      }
    }

    // Ownership check if needed
    if (ownershipResource && ownershipParamKey) {
      const resourceId = params[ownershipParamKey]
      if (resourceId) {
        try {
          await assertOwnership(
            ownershipResource,
            resourceId,
            session.user.id,
            session.user.role
          )
        } catch (error) {
          return {
            allowed: false,
            error: 'Forbidden',
            code: 403,
          }
        }
      }
    }

    return { allowed: true }
  }
}

// Re-export role utilities
export { canAccess, Role, roleHierarchy } from './roles'
export { assertOwnership, OwnershipError } from './ownership'
