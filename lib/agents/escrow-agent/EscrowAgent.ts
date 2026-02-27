import { BaseAgent } from '../base/BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from '../base/types'
import { runGuardrails } from '@/lib/agent/guardrails'
import { checkPermission, type Session } from '@/lib/agent/permissions'
import { assertTransition } from '@/lib/agent/state-machine'
import { workingMemory } from '@/lib/agent/memory/workingMemory'
import { messageBus } from '../base/MessageBus'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enqueue } from '@/lib/jobs/queue'
import { v4 as uuidv4 } from 'uuid'

export class EscrowAgent extends BaseAgent {
  type: AgentType = 'escrow'
  handledActions = ['submitOffer', 'acceptOffer', 'captureEscrow', 'releaseEscrow', 'refundEscrow', 'escrowStatus']

  async handle(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now()
    const span = this.trace(message.action)

    try {
      const { action, payload, userId, sessionId } = message

      // 1. Run guardrails on payload
      try {
        const session: Session = {
          user: { id: userId, role: 'user' as any }
        }
        await runGuardrails(action, payload, session)
      } catch (error: any) {
        this.log('guardrails_failed', { action, error: error.error })
        return {
          success: false,
          error: error.error || 'Guardrails validation failed',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 2. Run permission check
      try {
        const session: Session = {
          user: { id: userId, role: 'user' as any }
        }
        const permResult = await checkPermission(action, payload, session)
        if (!permResult.allowed) {
          this.log('permission_denied', { action, error: permResult.error })
          return {
            success: false,
            error: permResult.error || 'Access denied',
            handledBy: this.type,
            durationMs: Date.now() - startTime,
          }
        }
      } catch (error: any) {
        this.log('permission_check_failed', { action, error })
        return {
          success: false,
          error: 'Permission check failed',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 3. For financial actions, check if already completed in this session
      if (['captureEscrow', 'releaseEscrow', 'refundEscrow'].includes(action)) {
        const state = workingMemory['store'].get(sessionId)
        if (state && state.completedActions.includes(action)) {
          this.log('duplicate_financial_action', { action, sessionId })
          return {
            success: false,
            error: 'This action has already been completed in this session',
            handledBy: this.type,
            durationMs: Date.now() - startTime,
          }
        }
      }

      // 4. Route to correct handler
      let response: AgentResponse
      switch (action) {
        case 'submitOffer':
          response = await this.submitOffer(payload as any, userId, sessionId, message.correlationId)
          break
        case 'acceptOffer':
          response = await this.acceptOffer(payload as any, userId, sessionId, message.correlationId)
          break
        case 'captureEscrow':
          response = await this.captureEscrow(payload as any, userId, sessionId, message.correlationId)
          break
        case 'releaseEscrow':
          response = await this.releaseEscrow(payload as any, userId, sessionId, message.correlationId)
          break
        case 'refundEscrow':
          response = await this.refundEscrow(payload as any, userId, sessionId, message.correlationId)
          break
        case 'escrowStatus':
          response = await this.getStatus(payload as any, userId)
          break
        default:
          response = {
            success: false,
            error: `Unknown action: ${action}`,
            handledBy: this.type,
            durationMs: Date.now() - startTime,
          }
      }

      return response
    } catch (error: any) {
      this.log('handler_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Internal agent error',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } finally {
      span.end()
    }
  }

  private async submitOffer(
    payload: { inquiryId: string; price: number; description?: string },
    userId: string,
    sessionId: string,
    correlationId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    try {
      const { data, error } = await supabaseAdmin
        .from('offers')
        .insert({
          inquiry_id: payload.inquiryId,
          partner_id: userId,
          price_cents: Math.round(payload.price * 100),
          description: payload.description,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        this.log('submit_offer_failed', { error: error.message })
        return {
          success: false,
          error: 'Failed to submit offer',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      const eventMessage = {
        id: uuidv4(),
        from: this.type as AgentType,
        to: 'notify' as AgentType,
        type: 'event' as const,
        action: 'offer_submitted',
        payload: { offerId: data.id, inquiryId: payload.inquiryId, userId },
        correlationId,
        sessionId,
        userId,
        timestamp: Date.now(),
        priority: 'normal' as const,
      }

      try {
        await messageBus.send(eventMessage)
      } catch (err) {
        console.warn('[EscrowAgent] Failed to broadcast offer_submitted event:', err)
      }

      this.log('offer_submitted', { offerId: data.id, inquiryId: payload.inquiryId })

      return {
        success: true,
        data: { offerId: data.id },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('submit_offer_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to submit offer',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async acceptOffer(
    payload: { offerId: string },
    userId: string,
    sessionId: string,
    correlationId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    try {
      // Create escrow
      const { data, error } = await supabaseAdmin
        .from('escrows')
        .insert({
          offer_id: payload.offerId,
          status: 'pending',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        this.log('accept_offer_failed', { error: error.message })
        return {
          success: false,
          error: 'Failed to accept offer',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      workingMemory.setFocus(sessionId, 'escrow', data.id, 'pending')

      const eventMessage = {
        id: uuidv4(),
        from: this.type as AgentType,
        to: 'notify' as AgentType,
        type: 'event' as const,
        action: 'escrow_created',
        payload: { escrowId: data.id, offerId: payload.offerId, userId },
        correlationId,
        sessionId,
        userId,
        timestamp: Date.now(),
        priority: 'normal' as const,
      }

      try {
        await messageBus.send(eventMessage)
      } catch (err) {
        console.warn('[EscrowAgent] Failed to broadcast escrow_created event:', err)
      }

      this.log('escrow_created', { escrowId: data.id, offerId: payload.offerId })

      return {
        success: true,
        data: { escrowId: data.id },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('accept_offer_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to accept offer',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async captureEscrow(
    payload: { escrowId: string },
    userId: string,
    sessionId: string,
    correlationId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    try {
      // 1. Check state transition
      try {
        await assertTransition('escrow', payload.escrowId, 'captured', sessionId)
      } catch (error: any) {
        this.log('state_transition_failed', { error: error.error })
        return {
          success: false,
          error: error.error || 'Invalid state transition',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 2. Update DB
      const { error } = await supabaseAdmin
        .from('escrows')
        .update({ status: 'captured', updated_at: new Date().toISOString() })
        .eq('id', payload.escrowId)

      if (error) {
        this.log('capture_escrow_failed', { error: error.message })
        return {
          success: false,
          error: 'Failed to capture escrow',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 3. Enqueue Stripe capture job
      try {
        await enqueue('stripe_capture_payment', {
          escrowId: payload.escrowId,
        })
      } catch (err) {
        console.warn('[EscrowAgent] Failed to enqueue stripe_capture_payment:', err)
      }

      // 4. Mark completed
      workingMemory.markCompleted(sessionId, 'captureEscrow')

      // 5. Broadcast event
      const eventMessage = {
        id: uuidv4(),
        from: this.type as AgentType,
        to: 'notify' as AgentType,
        type: 'event' as const,
        action: 'escrow_captured',
        payload: { escrowId: payload.escrowId, userId },
        correlationId,
        sessionId,
        userId,
        timestamp: Date.now(),
        priority: 'high' as const,
      }

      try {
        await messageBus.send(eventMessage)
      } catch (err) {
        console.warn('[EscrowAgent] Failed to broadcast escrow_captured event:', err)
      }

      this.log('escrow_captured', { escrowId: payload.escrowId })

      return {
        success: true,
        data: { escrowId: payload.escrowId },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('capture_escrow_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to capture escrow',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async releaseEscrow(
    payload: { escrowId: string },
    userId: string,
    sessionId: string,
    correlationId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    try {
      // 1. Check state transition
      try {
        await assertTransition('escrow', payload.escrowId, 'released', sessionId)
      } catch (error: any) {
        this.log('state_transition_failed', { error: error.error })
        return {
          success: false,
          error: error.error || 'Invalid state transition',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 2. Update DB
      const { error } = await supabaseAdmin
        .from('escrows')
        .update({ status: 'released', released_at: new Date().toISOString() })
        .eq('id', payload.escrowId)

      if (error) {
        this.log('release_escrow_failed', { error: error.message })
        return {
          success: false,
          error: 'Failed to release escrow',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 3. Enqueue Stripe release job
      try {
        await enqueue('stripe_release_payment', {
          escrowId: payload.escrowId,
        })
      } catch (err) {
        console.warn('[EscrowAgent] Failed to enqueue stripe_release_payment:', err)
      }

      // 4. Mark completed
      workingMemory.markCompleted(sessionId, 'releaseEscrow')

      // 5. Broadcast event
      const eventMessage = {
        id: uuidv4(),
        from: this.type as AgentType,
        to: 'notify' as AgentType,
        type: 'event' as const,
        action: 'escrow_released',
        payload: { escrowId: payload.escrowId, userId },
        correlationId,
        sessionId,
        userId,
        timestamp: Date.now(),
        priority: 'high' as const,
      }

      try {
        await messageBus.send(eventMessage)
      } catch (err) {
        console.warn('[EscrowAgent] Failed to broadcast escrow_released event:', err)
      }

      this.log('escrow_released', { escrowId: payload.escrowId })

      return {
        success: true,
        data: { escrowId: payload.escrowId },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('release_escrow_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to release escrow',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async refundEscrow(
    payload: { escrowId: string; reason?: string },
    userId: string,
    sessionId: string,
    correlationId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now()
    try {
      // 1. Check state transition
      try {
        await assertTransition('escrow', payload.escrowId, 'refunded', sessionId)
      } catch (error: any) {
        this.log('state_transition_failed', { error: error.error })
        return {
          success: false,
          error: error.error || 'Invalid state transition',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 2. Update DB
      const { error } = await supabaseAdmin
        .from('escrows')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('id', payload.escrowId)

      if (error) {
        this.log('refund_escrow_failed', { error: error.message })
        return {
          success: false,
          error: 'Failed to refund escrow',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // 3. Enqueue Stripe refund job
      try {
        await enqueue('stripe_refund_payment', {
          escrowId: payload.escrowId,
          reason: payload.reason,
        })
      } catch (err) {
        console.warn('[EscrowAgent] Failed to enqueue stripe_refund_payment:', err)
      }

      // 4. Mark completed
      workingMemory.markCompleted(sessionId, 'refundEscrow')

      // 5. Broadcast event
      const eventMessage = {
        id: uuidv4(),
        from: this.type as AgentType,
        to: 'notify' as AgentType,
        type: 'event' as const,
        action: 'escrow_refunded',
        payload: { escrowId: payload.escrowId, userId, reason: payload.reason },
        correlationId,
        sessionId,
        userId,
        timestamp: Date.now(),
        priority: 'high' as const,
      }

      try {
        await messageBus.send(eventMessage)
      } catch (err) {
        console.warn('[EscrowAgent] Failed to broadcast escrow_refunded event:', err)
      }

      this.log('escrow_refunded', { escrowId: payload.escrowId })

      return {
        success: true,
        data: { escrowId: payload.escrowId },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('refund_escrow_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to refund escrow',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async getStatus(payload: { escrowId: string }, userId: string): Promise<AgentResponse> {
    const startTime = Date.now()
    try {
      const { data, error } = await supabaseAdmin
        .from('escrows')
        .select('*')
        .eq('id', payload.escrowId)
        .single()

      if (error || !data) {
        this.log('get_status_failed', { error: error?.message })
        return {
          success: false,
          error: 'Escrow not found',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      return {
        success: true,
        data: { escrow: data },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('get_status_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to get escrow status',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }
}
