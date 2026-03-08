/**
 * Release Escrow Tool
 * Customer confirms work is done and releases payment to partner
 * Must use state guard to verify escrow is in 'captured' state
 */

import { createClient } from '@/lib/supabase/server'
import type { AgentContext } from '../context'

export async function releaseEscrow(
  params: Record<string, unknown>,
  context: AgentContext
): Promise<{ escrowId: string; status: string }> {
  const { escrowId, confirmationDetails } = params as any

  if (!escrowId) {
    throw {
      success: false,
      error: 'Missing required field: escrowId',
      code: 400,
    }
  }

  try {
    const supabase = await createClient()

    // Get escrow
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .select('id, status, customer_id')
      .eq('id', escrowId)
      .single()

    if (escrowError || !escrow) {
      throw {
        success: false,
        error: 'Escrow not found',
        code: 404,
      }
    }

    // Verify customer owns this escrow
    if (escrow.customer_id !== context.userId) {
      throw {
        success: false,
        error: 'Forbidden: you are not the customer for this escrow',
        code: 403,
      }
    }

    if (escrow.status !== 'captured') {
      throw {
        success: false,
        error: `Cannot release ${escrow.status} escrow (must be captured)`,
        code: 409,
      }
    }

    // Update to released
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'released',
        released_at: new Date().toISOString(),
        confirmation_details: confirmationDetails || null,
      })
      .eq('id', escrowId)

    if (updateError) {
      throw {
        success: false,
        error: 'Failed to release escrow',
        code: 500,
      }
    }

    return {
      escrowId,
      status: 'released',
    }
  } catch (error: any) {
    throw {
      success: false,
      error: error?.error || error?.message || 'Failed to release escrow',
      code: error?.code || 500,
    }
  }
}
