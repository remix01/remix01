/**
 * Tool Router — Routes tool calls through validation & guardrails
 * 
 * Execution flow:
 * 1. Validate tool exists in registry
 * 2. Run guardrails (schema, injection, amount, rate limit)
 * 3. Check role-based permissions
 * 4. Run state guard (e.g., can only release captured escrows)
 * 5. Execute tool handler
 * 6. Return { success, data?, error? }
 */

import { runGuardrails } from './guardrails'
import { checkPermission } from './permissions'
import { ToolCallResult, type AgentContext } from './context'
import { agentLogger } from '@/lib/observability'

// Import all tool handlers
import { createInquiry } from './tools/createInquiry'
import { submitOffer } from './tools/submitOffer'
import { acceptOffer } from './tools/acceptOffer'
import { captureEscrow } from './tools/captureEscrow'
import { releaseEscrow } from './tools/releaseEscrow'
import { refundEscrow } from './tools/refundEscrow'

export interface ToolDefinition {
  handler: (params: Record<string, unknown>, context: AgentContext) => Promise<unknown>
  requiredRole: 'user' | 'partner' | 'admin' | 'system'
  stateGuard?: string // e.g., 'escrow.captured' — asserted before execution
  ownershipChecks?: Array<{
    resource: 'inquiry' | 'offer' | 'escrow'
    paramKey: string
  }>
}

/**
 * Tool registry — all available tools
 * Required role prevents low-privilege users from calling admin tools
 * State guard prevents invalid state transitions
 */
export const toolRegistry: Record<string, ToolDefinition> = {
  // Inquiry management
  createInquiry: {
    handler: createInquiry,
    requiredRole: 'user',
  },

  // Offer management
  submitOffer: {
    handler: submitOffer,
    requiredRole: 'partner',
    ownershipChecks: [{ resource: 'inquiry', paramKey: 'inquiryId' }],
  },
  acceptOffer: {
    handler: acceptOffer,
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'offer', paramKey: 'offerId' }],
  },

  // Escrow management
  captureEscrow: {
    handler: captureEscrow,
    requiredRole: 'system',
    ownershipChecks: [{ resource: 'escrow', paramKey: 'escrowId' }],
  },
  releaseEscrow: {
    handler: releaseEscrow,
    requiredRole: 'user',
    ownershipChecks: [{ resource: 'escrow', paramKey: 'escrowId' }],
  },
  refundEscrow: {
    handler: refundEscrow,
    requiredRole: 'admin',
    ownershipChecks: [{ resource: 'escrow', paramKey: 'escrowId' }],
  },
}

/**
 * Route a tool call through the full pipeline
 * Returns { success, data, error }
 */
export async function routeTool(
  toolName: string,
  params: Record<string, unknown>,
  context: AgentContext
): Promise<ToolCallResult> {
  // 1. VALIDATE tool exists
  const toolDef = toolRegistry[toolName]
  if (!toolDef) {
    return {
      success: false,
      error: `Unknown tool: ${toolName}`,
      code: 400,
    }
  }

  // Start timing + log tool_call_started
  const doneLog = agentLogger.logToolCall(
    context.sessionId,
    context.userId,
    toolName,
    params
  )

  try {
    // 2. RUN GUARDRAILS (schema, injection, amounts, rate limits)
    await runGuardrails(toolName, params, {
      user: {
        id: context.userId,
        email: context.userEmail,
        role: context.userRole as any,
      },
    })

    // 3. CHECK PERMISSIONS (role-based + ownership)
    const permCheck = await checkPermission(toolName, params, {
      user: {
        id: context.userId,
        email: context.userEmail,
        role: context.userRole as any,
      },
    })
    if (!permCheck.allowed) {
      doneLog(permCheck.error || 'Forbidden')
      return {
        success: false,
        error: permCheck.error || 'Forbidden',
        code: permCheck.code || 403,
      }
    }

    // 4. RUN STATE GUARD if defined
    // State guards are checked in tool handlers via assertTransition()

    // 5. EXECUTE HANDLER
    const result = await toolDef.handler(params, context)

    doneLog() // success
    return {
      success: true,
      data: result,
    }
  } catch (error: any) {
    const errorMessage = error?.error || error?.message || String(error)
    const errorCode = error?.code || 500

    doneLog(errorMessage)
    console.error(`[TOOL ROUTER] Error executing ${toolName}:`, error)

    return {
      success: false,
      error: errorMessage,
      code: errorCode,
    }
  }
}

/**
 * Get list of available tools for current user role
 * Used to customize LLM system prompt based on permissions
 */
export function getAvailableTools(userRole: string): string[] {
  return Object.entries(toolRegistry)
    .filter(([_, def]) => {
      // System tools only available to system role
      if (def.requiredRole === 'system') return userRole === 'system'
      // Admin tools only to admins
      if (def.requiredRole === 'admin') return userRole === 'admin'
      // Partner/user tools to their respective roles
      return def.requiredRole === userRole || def.requiredRole === 'user'
    })
    .map(([name]) => name)
}
