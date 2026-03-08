/**
 * Refund Escrow Tool
 * Admin tool: refunds a disputed escrow back to customer
 * Only admins can call this
 */

import { createClient } from '@/lib/supabase/server'
import type { AgentContext } from '../context'

export async function refundEscrow(
  params: Record<string, unknown>,
  context: AgentContext
): Promise<{ escrowId: string; status: string }> {
  const { escrowId, reason } = params as any

  if (!escrowId || !reason) {
    throw {
      success: false,
      error: 'Missing required fields: escrowId, reason',
      code: 400,
    }
  }

  try {
    const supabase = await createClient()

    // Get escrow
    const { data: escrow, error: escrowError } = await supabase
      .from('escrow_transactions')
      .select('id, status')
      .eq('id', escrowId)
      .single()

    if (escrowError || !escrow) {
      throw {
        success: false,
        error: 'Escrow not found',
        code: 404,
      }
    }

    if (escrow.status !== 'disputed') {
      throw {
        success: false,
        error: `Cannot refund ${escrow.status} escrow (must be disputed)`,
        code: 409,
      }
    }

    // Update to refunded
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_reason: reason,
      })
      .eq('id', escrowId)

    if (updateError) {
      throw {
        success: false,
        error: 'Failed to refund escrow',
        code: 500,
      }
    }

    return {
      escrowId,
      status: 'refunded',
    }
  } catch (error: any) {
    throw {
      success: false,
      error: error?.error || error?.message || 'Failed to refund escrow',
      code: error?.code || 500,
    }
  }
}
