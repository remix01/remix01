import { BaseAgent } from '../base/BaseAgent'
import type { AgentType, AgentMessage, AgentResponse } from '../base/types'
import { checkPermission, type Session } from '@/lib/agent/permissions'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { enqueueJob } from '@/lib/jobs/queue'
import { v4 as uuidv4 } from 'uuid'

export class NotifyAgent extends BaseAgent {
  type: AgentType = 'notify'
  handledActions = [
    'sendNotification',
    'updatePreferences',
    // Broadcast events
    'inquiry_created',
    'escrow_captured',
    'escrow_released',
    'escrow_refunded',
    'dispute_opened',
    'dispute_resolved',
  ]

  async handle(message: AgentMessage): Promise<AgentResponse> {
    const startTime = Date.now()
    const span = this.trace(message.action)

    try {
      const { action, payload, userId, sessionId } = message

      // Direct calls
      if (action === 'sendNotification') {
        return await this.sendDirect(payload, userId, startTime)
      }
      if (action === 'updatePreferences') {
        return await this.updatePrefs(payload, userId, startTime)
      }

      // Broadcast event handlers — no userId required for events
      if (action === 'inquiry_created') {
        return await this.onInquiryCreated(payload, sessionId, startTime)
      }
      if (action === 'escrow_captured') {
        return await this.onEscrowCaptured(payload, sessionId, startTime)
      }
      if (action === 'escrow_released') {
        return await this.onEscrowReleased(payload, sessionId, startTime)
      }
      if (action === 'escrow_refunded') {
        return await this.onEscrowRefunded(payload, sessionId, startTime)
      }
      if (action === 'dispute_opened') {
        return await this.onDisputeOpened(payload, sessionId, startTime)
      }
      if (action === 'dispute_resolved') {
        return await this.onDisputeResolved(payload, sessionId, startTime)
      }

      return {
        success: false,
        error: `Unknown action: ${action}`,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
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

  private async sendDirect(
    payload: any,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { recipientUserId, template, templateData } = payload

    // Permission: user can only send to themselves
    if (recipientUserId !== userId) {
      this.log('permission_denied', { error: 'Cannot send to other users' })
      return {
        success: false,
        error: 'Access denied',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }

    try {
      // Fetch recipient to get email
      const { data: profile, error: fetchError } = await supabaseAdmin
        .from('profiles')
        .select('email, notification_preferences')
        .eq('id', recipientUserId)
        .single()

      if (fetchError || !profile) {
        return {
          success: false,
          error: 'Recipient not found',
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // Check preferences
      const prefs = profile.notification_preferences || {}
      if (prefs[template] === false) {
        this.log('notification_skipped', { reason: 'User disabled' })
        return {
          success: true,
          data: { sent: false, reason: 'User disabled notifications' },
          handledBy: this.type,
          durationMs: Date.now() - startTime,
        }
      }

      // Enqueue email job
      await enqueueJob('send_release_email', {
        recipientEmail: profile.email,
        template,
        templateData,
      })

      this.log('notification_sent', { template, recipientUserId })
      return {
        success: true,
        data: { sent: true },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('error', { error: error.message })
      return {
        success: false,
        error: 'Failed to send notification',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async updatePrefs(
    payload: any,
    userId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { preferences } = payload

    try {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ notification_preferences: preferences })
        .eq('id', userId)

      if (error) throw error

      this.log('preferences_updated', { userId })
      return {
        success: true,
        data: { updated: true },
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      return {
        success: false,
        error: 'Failed to update preferences',
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  // ── Broadcast Event Handlers ────────────────────────────────────────

  private async onInquiryCreated(
    payload: any,
    sessionId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { inquiryId, userId, title } = payload

    try {
      // Get user email
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', userId)
        .single()

      if (profile?.email) {
        await enqueueJob('send_release_email', {
          recipientEmail: profile.email,
          template: 'inquiry_created',
          templateData: { inquiryId, title },
        })
      }

      this.log('inquiry_created_handled', { inquiryId })
      return {
        success: true,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      this.log('error', { error: error.message })
      return {
        success: true, // Don't fail broadcasts
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    }
  }

  private async onEscrowCaptured(
    payload: any,
    sessionId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { escrowId, customerId, partnerId, amount } = payload

    try {
      // Notify both parties
      const profiles = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('id', [customerId, partnerId])

      for (const profile of profiles.data || []) {
        await enqueueJob('send_payment_confirmed_email', {
          recipientEmail: profile.email,
          template: 'escrow_captured',
          templateData: { escrowId, amount },
        })
      }

      this.log('escrow_captured_handled', { escrowId })
      return {
        success: true,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      return { success: true, handledBy: this.type, durationMs: Date.now() - startTime }
    }
  }

  private async onEscrowReleased(
    payload: any,
    sessionId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { escrowId, customerId, partnerId, amount } = payload

    try {
      const profiles = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('id', [customerId, partnerId])

      for (const profile of profiles.data || []) {
        await enqueueJob('send_release_email', {
          recipientEmail: profile.email,
          template: 'escrow_released',
          templateData: { escrowId, amount },
        })
      }

      this.log('escrow_released_handled', { escrowId })
      return {
        success: true,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      return { success: true, handledBy: this.type, durationMs: Date.now() - startTime }
    }
  }

  private async onEscrowRefunded(
    payload: any,
    sessionId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { escrowId, customerId, partnerId, amount } = payload

    try {
      const profiles = await supabaseAdmin
        .from('profiles')
        .select('id, email')
        .in('id', [customerId, partnerId])

      for (const profile of profiles.data || []) {
        await enqueueJob('send_refund_email', {
          recipientEmail: profile.email,
          template: 'escrow_refunded',
          templateData: { escrowId, amount },
        })
      }

      this.log('escrow_refunded_handled', { escrowId })
      return {
        success: true,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      return { success: true, handledBy: this.type, durationMs: Date.now() - startTime }
    }
  }

  private async onDisputeOpened(
    payload: any,
    sessionId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { disputeId, escrowId, userId, reason } = payload

    try {
      // Get all involved parties: customer, partner, and admin
      const { data: escrow } = await supabaseAdmin
        .from('escrows')
        .select('customer_id, partner_id, customer_email, partner_email')
        .eq('id', escrowId)
        .single()

      if (escrow) {
        // Email to both parties
        for (const email of [escrow.customer_email, escrow.partner_email]) {
          if (email) {
            await enqueueJob('send_dispute_email', {
              recipientEmail: email,
              template: 'dispute_opened',
              templateData: { disputeId, escrowId, reason },
            })
          }
        }
      }

      // Alert admin (send to admin alert email)
      await enqueueJob('send_dispute_email', {
        recipientEmail: 'admin@liftgo.com', // TODO: config
        template: 'dispute_opened_admin_alert',
        templateData: { disputeId, escrowId, openedBy: userId, reason },
      })

      this.log('dispute_opened_handled', { disputeId })
      return {
        success: true,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      return { success: true, handledBy: this.type, durationMs: Date.now() - startTime }
    }
  }

  private async onDisputeResolved(
    payload: any,
    sessionId: string,
    startTime: number
  ): Promise<AgentResponse> {
    const { disputeId, escrowId, resolution, newStatus } = payload

    try {
      const { data: escrow } = await supabaseAdmin
        .from('escrows')
        .select('customer_email, partner_email')
        .eq('id', escrowId)
        .single()

      if (escrow) {
        for (const email of [escrow.customer_email, escrow.partner_email]) {
          if (email) {
            await enqueueJob('notify_dispute_resolved', {
              recipientEmail: email,
              template: 'dispute_resolved',
              templateData: { disputeId, escrowId, resolution, newStatus },
            })
          }
        }
      }

      this.log('dispute_resolved_handled', { disputeId })
      return {
        success: true,
        handledBy: this.type,
        durationMs: Date.now() - startTime,
      }
    } catch (error: any) {
      return { success: true, handledBy: this.type, durationMs: Date.now() - startTime }
    }
  }
}
