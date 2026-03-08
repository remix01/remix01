import { BaseAgent } from '../base/BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from '../base/types'
import { runGuardrails } from '@/lib/agent/guardrails'
import { checkPermission, type Session } from '@/lib/agent/permissions'
import { assertTransition } from '@/lib/agent/state-machine'
import { messageBus } from '../base/MessageBus'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { v4 as uuidv4 } from 'uuid'

export class InquiryAgent extends BaseAgent {
  type: AgentType = 'inquiry'
  handledActions = ['createInquiry', 'listInquiries', 'closeInquiry']

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

      // 3. Route to correct handler
      let response: AgentResponse
      switch (action) {
        case 'createInquiry':
          response = await this.createInquiry(payload as any, userId, sessionId, message.correlationId)
          break
        case 'listInquiries':
          response = await this.listInquiries(userId)
          break
        case 'closeInquiry':
          response = await this.closeInquiry(payload as any, userId, sessionId, message.correlationId)
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

  private async createInquiry(
    payload: { title: string; description: string; budget?: number },
    userId: string,
    sessionId: string,
    correlationId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now()

    try {
      // Create inquiry in DB
      const { data, error } = await supabaseAdmin
        .from('povprasevanja')
        .insert({
          created_by: userId,
          title: payload.title,
          description: payload.description,
          budget_cents: payload.budget ? Math.round(payload.budget * 100) : null,
          status: 'open',
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (error) {
        this.log('create_inquiry_failed', { error: error.message })
        return {
          success: false,
          error: 'Failed to create inquiry',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // Broadcast event for other agents
      const eventMessage = {
        id: uuidv4(),
        from: this.type as AgentType,
        to: 'notify' as AgentType,
        type: 'event' as const,
        action: 'inquiry_created',
        payload: { inquiryId: data.id, userId, title: payload.title },
        correlationId,
        sessionId,
        userId,
        timestamp: Date.now(),
        priority: 'normal' as const,
      }

      try {
        await messageBus.send(eventMessage)
      } catch (err) {
        console.warn('[InquiryAgent] Failed to broadcast inquiry_created event:', err)
        // Don't fail the request, just log
      }

      this.log('inquiry_created', { inquiryId: data.id, userId })

      return {
        success: true,
        data: { inquiryId: data.id },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('create_inquiry_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to create inquiry',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async listInquiries(userId: string): Promise<AgentResponse> {
    const startTime = Date.now()

    try {
      const { data, error } = await supabaseAdmin
        .from('povprasevanja')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) {
        this.log('list_inquiries_failed', { error: error.message })
        return {
          success: false,
          error: 'Failed to list inquiries',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      return {
        success: true,
        data: { inquiries: data || [] },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('list_inquiries_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to list inquiries',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async closeInquiry(
    payload: { inquiryId: string },
    userId: string,
    sessionId: string,
    correlationId: string
  ): Promise<AgentResponse> {
    const startTime = Date.now()

    try {
      // Verify ownership
      const { data: inquiry } = await supabaseAdmin
        .from('povprasevanja')
        .select('created_by, status')
        .eq('id', payload.inquiryId)
        .single()

      if (!inquiry || inquiry.created_by !== userId) {
        this.log('close_inquiry_forbidden', { inquiryId: payload.inquiryId, userId })
        return {
          success: false,
          error: 'Forbidden',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // Check state transition
      try {
        await assertTransition('inquiry', payload.inquiryId, 'closed', sessionId)
      } catch (error: any) {
        this.log('state_transition_failed', { error: error.error })
        return {
          success: false,
          error: error.error || 'Invalid state transition',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // Update DB
      const { error } = await supabaseAdmin
        .from('povprasevanja')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', payload.inquiryId)

      if (error) {
        this.log('close_inquiry_failed', { error: error.message })
        return {
          success: false,
          error: 'Failed to close inquiry',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // Broadcast event
      const eventMessage = {
        id: uuidv4(),
        from: this.type as AgentType,
        to: 'notify' as AgentType,
        type: 'event' as const,
        action: 'inquiry_closed',
        payload: { inquiryId: payload.inquiryId, userId },
        correlationId,
        sessionId,
        userId,
        timestamp: Date.now(),
        priority: 'normal' as const,
      }

      try {
        await messageBus.send(eventMessage)
      } catch (err) {
        console.warn('[InquiryAgent] Failed to broadcast inquiry_closed event:', err)
      }

      this.log('inquiry_closed', { inquiryId: payload.inquiryId, userId })

      return {
        success: true,
        data: { inquiryId: payload.inquiryId },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('close_inquiry_error', { error: error?.message })
      return {
        success: false,
        error: error?.message || 'Failed to close inquiry',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }
}
