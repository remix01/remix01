import { BaseAgent } from '../base/BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from '../base/types'
import { runGuardrails } from '@/lib/agent/guardrails'
import { checkPermission, assertOwnership, type Session } from '@/lib/agent/permissions'
import { assertEscrowTransition } from '@/lib/agent/state-machine'
import { messageBus } from '../base/MessageBus'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enqueueJob } from '@/lib/jobs/queue'
import { v4 as uuidv4 } from 'uuid'

export class DisputeAgent extends BaseAgent {
  type: AgentType = 'dispute'
  handledActions = ['openDispute', 'resolveDispute', 'disputeStatus']

  async handle(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now()
    const span = this.trace(message.action)

    try {
      const { action, payload, userId, sessionId } = message

      switch (action) {
        case 'openDispute':
          return await this.openDispute(payload, userId, sessionId, startTime)
        case 'resolveDispute':
          return await this.resolveDispute(payload, userId, sessionId, startTime)
        case 'disputeStatus':
          return await this.getStatus(payload, userId, startTime)
        default:
          return {
            success: false,
            error: `Unknown action: ${action}`,
            handledBy: this.type,
            durationMs: Date.now() - startTime,
          }
      }
    } catch (error: any) {
      this.log('error', { error: error.message })
      return {
        success: false,
        error: error.message || 'Internal error',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async openDispute(
    payload: any,
    userId: string,
    sessionId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { escrowId, reason, description } = payload

    // 1. Guardrails check
    try {
      const session: Session = { user: { id: userId, role: 'user' as any } }
      await runGuardrails('openDispute', payload, session)
    } catch (error: any) {
      this.log('guardrails_failed', { error: error.error })
      return {
        success: false,
        error: error.error || 'Validation failed',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    // 2. Permission: user must own the escrow
    try {
      const session: Session = { user: { id: userId, role: 'user' as any } }
      const permResult = await checkPermission('openDispute', payload, session)
      if (!permResult.allowed) {
        this.log('permission_denied', { error: permResult.error })
        return {
          success: false,
          error: permResult.error || 'Access denied',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }
    } catch (error: any) {
      this.log('permission_check_error', { error: error.message })
      return {
        success: false,
        error: 'Permission check failed',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    // 3. State machine: escrow must be in 'paid' status to transition to 'disputed'
    try {
      await assertEscrowTransition(escrowId, 'disputed')
    } catch (error: any) {
      this.log('state_transition_blocked', { error: error.error, escrowId })
      return {
        success: false,
        error: error.error || 'Cannot open dispute on this escrow',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    // 4. DB: create dispute record and update escrow status
    const disputeId = uuidv4()
    try {
      const { error: insertError } = await supabaseAdmin
        .from('disputes')
        .insert({
          id: disputeId,
          escrow_id: escrowId,
          opened_by: userId,
          reason,
          description,
          status: 'open',
          created_at: new Date().toISOString(),
        })

      if (insertError) throw insertError

      // Update escrow status
      const { error: updateError } = await supabaseAdmin
        .from('escrows')
        .update({ status: 'disputed', updated_at: new Date().toISOString() })
        .eq('id', escrowId)

      if (updateError) throw updateError

      this.log('dispute_opened', { disputeId, escrowId, userId })
    } catch (error: any) {
      this.log('db_error', { error: error.message })
      return {
        success: false,
        error: 'Failed to create dispute',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    // 5. Broadcast to NotifyAgent
    try {
      await messageBus.send({
        to: 'notify',
        action: 'dispute_opened',
        payload: { disputeId, escrowId, userId, reason, description },
        userId,
        sessionId,
        correlationId: uuidv4(),
      })
    } catch (error: any) {
      this.log('broadcast_failed', { error: error.message })
      // Don't fail the response — notification is async
    }

    return {
      success: true,
      data: { disputeId, escrowId },
      handledBy: this.type,
      durationMs: Date.now() - startTime,
    }
  }

  private async resolveDispute(
    payload: any,
    userId: string,
    sessionId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { disputeId, resolution, refundAmount } = payload

    // 1. Permission: only admin can resolve
    try {
      const session: Session = { user: { id: userId, role: 'admin' as any } }
      const permResult = await checkPermission('resolveDispute', payload, session)
      if (!permResult.allowed) {
        this.log('permission_denied', { error: 'Admin role required' })
        return {
          success: false,
          error: 'Only admins can resolve disputes',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }
    } catch (error: any) {
      return {
        success: false,
        error: 'Permission check failed',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    // 2. Fetch dispute and escrow
    let escrowId: string
    try {
      const { data: dispute, error: fetchError } = await supabaseAdmin
        .from('disputes')
        .select('escrow_id, status')
        .eq('id', disputeId)
        .single()

      if (fetchError || !dispute) throw new Error('Dispute not found')
      escrowId = dispute.escrow_id
    } catch (error: any) {
      return {
        success: false,
        error: 'Dispute not found',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    // 3. State machine: transition based on resolution
    let newStatus: 'refunded' | 'released'
    if (resolution === 'refund') {
      newStatus = 'refunded'
    } else if (resolution === 'release') {
      newStatus = 'released'
    } else {
      return {
        success: false,
        error: 'Invalid resolution: must be "refund" or "release"',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    try {
      await assertEscrowTransition(escrowId, newStatus)
    } catch (error: any) {
      this.log('state_transition_blocked', { error: error.error, escrowId })
      return {
        success: false,
        error: 'Cannot apply this resolution',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    // 4. DB: update dispute and escrow
    try {
      const { error: updateDisputeError } = await supabaseAdmin
        .from('disputes')
        .update({
          status: 'resolved',
          resolution,
          resolved_by: userId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', disputeId)

      if (updateDisputeError) throw updateDisputeError

      const { error: updateEscrowError } = await supabaseAdmin
        .from('escrows')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', escrowId)

      if (updateEscrowError) throw updateEscrowError

      this.log('dispute_resolved', { disputeId, escrowId, resolution, newStatus })
    } catch (error: any) {
      this.log('db_error', { error: error.message })
      return {
        success: false,
        error: 'Failed to resolve dispute',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    // 5. Enqueue appropriate Stripe job
    if (resolution === 'refund') {
      try {
        await enqueueJob('stripe_refund_payment', {
          escrowId,
          amountCents: refundAmount,
          reason: 'Dispute resolution — refund to customer',
        })
      } catch (error: any) {
        this.log('job_enqueue_failed', { error: error.message })
        // Don't fail — admin can retry manually
      }
    } else if (resolution === 'release') {
      try {
        await enqueueJob('stripe_capture_payment', {
          escrowId,
          reason: 'Dispute resolution — release to partner',
        })
      } catch (error: any) {
        this.log('job_enqueue_failed', { error: error.message })
      }
    }

    // 6. Broadcast to NotifyAgent
    try {
      await messageBus.send({
        to: 'notify',
        action: 'dispute_resolved',
        payload: { disputeId, escrowId, resolution, newStatus },
        userId,
        sessionId,
        correlationId: uuidv4(),
      })
    } catch (error: any) {
      this.log('broadcast_failed', { error: error.message })
    }

    return {
      success: true,
      data: { disputeId, escrowId, newStatus },
      handledBy: this.type,
      durationMs: Date.now() - startTime,
    }
  }

  private async getStatus(
    payload: any,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { disputeId } = payload

    try {
      const { data: dispute, error } = await supabaseAdmin
        .from('disputes')
        .select('*')
        .eq('id', disputeId)
        .single()

      if (error || !dispute) {
        return {
          success: false,
          error: 'Dispute not found',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      this.log('dispute_status_fetched', { disputeId })
      return {
        success: true,
        data: dispute,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to fetch dispute',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }
}
