import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { handleAuthError } from '@/lib/api/auth-errors'
import { checkAIRateLimit } from '@/lib/rate-limit/limiters'
import {
  loadAiUsageProfile,
  normalizeDailyUsageWindow,
  evaluateAgentTierAccess,
} from '@/lib/agents/route-access-policy'
import type { AIAgentType } from '@/lib/agents/ai-router'

export interface AISecurityContext {
  userId: string
  tier: string
  usedToday: number
  dailyLimit: number
}

export interface AISecurityOptions {
  agentType?: AIAgentType
  skipQuotaCheck?: boolean
}

function fail(message: string, status: number, code: string, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: message,
      canonical_error: { code, message, ...(details ? { details } : {}) },
    },
    { status }
  )
}

/**
 * Unified security pipeline for all AI endpoints.
 *
 * Performs: auth -> rate-limit -> tier access -> daily quota.
 * Returns either a rejection response or a validated security context.
 */
export async function validateAIRequest(
  request: NextRequest,
  options: AISecurityOptions = {}
): Promise<{ error: NextResponse } | { context: AISecurityContext }> {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError) return { error: handleAuthError(authError) }
  if (!user) return { error: fail('Nepooblaščen dostop.', 401, 'UNAUTHORIZED') }

  const rateLimitResponse = await checkAIRateLimit(request, user.id)
  if (rateLimitResponse) return { error: rateLimitResponse }

  const profile = await loadAiUsageProfile(user.id)
  const tier = (profile?.subscription_tier ?? 'start') as string
  const usedToday = await normalizeDailyUsageWindow(user.id, profile)

  if (options.agentType) {
    const access = evaluateAgentTierAccess(options.agentType, tier)
    if (!access.allowed) {
      return {
        error: fail(
          'Ta agent je na voljo samo za PRO naročnike.',
          403,
          'FORBIDDEN',
          { upgrade_required: true, upgrade_url: '/obrtnik/narocnina' }
        ),
      }
    }

    if (!options.skipQuotaCheck) {
      if (access.dailyLimit === 0) {
        return {
          error: fail('Ta agent ni dostopen z vašim paketom.', 403, 'FORBIDDEN', { upgrade_required: true }),
        }
      }
      if (usedToday >= access.dailyLimit) {
        return {
          error: fail(
            `Dnevni limit dosežen (${access.dailyLimit} sporočil). Poskusite jutri.`,
            429,
            'LIMIT_REACHED',
            { limit_reached: true, used: usedToday, limit: access.dailyLimit }
          ),
        }
      }
    }

    return {
      context: { userId: user.id, tier, usedToday, dailyLimit: access.dailyLimit },
    }
  }

  return {
    context: { userId: user.id, tier, usedToday, dailyLimit: Infinity },
  }
}
