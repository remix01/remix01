/**
 * Capture Escrow Tool
 * System tool: moves payment from pending to captured state
 * Called after customer completes payment via Stripe
 */

import { createClient } from '@/lib/supabase/server'
import type { AgentContext } from '../context'

export async function captureEscrow(
  params: Record<string, unknown>,
  context: AgentContext
): Promise<{ escrowId: string; status: string }> {
  const { escrowId } = params as any

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

    if (escrow.status !== 'pending') {
      throw {
        success: false,
        error: `Cannot capture ${escrow.status} escrow`,
        code: 409,
      }
    }

    // Update to captured
    const { error: updateError } = await supabase
      .from('escrow_transactions')
      .update({
        status: 'captured',
        captured_at: new Date().toISOString(),
      })
      .eq('id', escrowId)

    if (updateError) {
      throw {
        success: false,
        error: 'Failed to capture escrow',
        code: 500,
      }
    }

    return {
      escrowId,
      status: 'captured',
    }
  } catch (error: any) {
    throw {
      success: false,
      error: error?.error || error?.message || 'Failed to capture escrow',
      code: error?.code || 500,
    }
  }
}
