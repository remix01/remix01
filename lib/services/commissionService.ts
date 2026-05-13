/**
 * Commission Service — Tracks platform commissions on completed jobs
 * 
 * Responsibilities:
 * - Create commission logs when jobs complete
 * - Track commission status through lifecycle
 * - Handle Stripe transfers to partner accounts
 * - Manage retries for failed transfers
 * - Emit events for analytics and notifications
 */

import { supabaseAdmin } from '@/lib/supabase-admin'
import { stripe } from '@/lib/stripe'
import { STRIPE_PRODUCTS } from '@/lib/stripe/config'
import type { Database } from '@/types/supabase'

export type CommissionStatus = 
  | 'pending' | 'earned' | 'transferred' | 'failed' | 'refunded'

interface CommissionLogParams {
  escrowId: string
  partnerId: string
  inquiryId?: string
  grossAmountCents: number
  commissionRate: number  // 0.10 for 10%, 0.05 for 5%
  stripeAccountId?: string
}

interface TransferResult {
  success: boolean
  transferId?: string
  error?: string
}

export const commissionService = {
  /**
   * Create a commission log when job is completed
   * Called after escrow payment is captured and job marked complete
   */
  async createCommissionLog(params: CommissionLogParams) {
    const commissionCents = Math.round(
      params.grossAmountCents * params.commissionRate
    )
    const partnerPayoutCents = params.grossAmountCents - commissionCents

    const { data, error } = await supabaseAdmin
      .from('commission_logs')
      .insert({
        escrow_id: params.escrowId,
        partner_id: params.partnerId,
        inquiry_id: params.inquiryId,
        gross_amount_cents: params.grossAmountCents,
        commission_rate: params.commissionRate,
        commission_cents: commissionCents,
        partner_payout_cents: partnerPayoutCents,
        stripe_account_id: params.stripeAccountId,
        status: 'earned',
        captured_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('[CommissionService] Failed to create log:', error)
      throw error
    }

    return {
      id: data.id,
      commission: commissionCents / 100,  // EUR
      payout: partnerPayoutCents / 100,   // EUR
    }
  },

  /**
   * Transfer commission payout to partner's Stripe connected account
   * Uses Stripe Connect for marketplace transfers
   */
  async transferToPartner(
    commissionId: string,
    stripeAccountId: string,
    amountCents: number
  ): Promise<TransferResult> {
    try {
      // Get commission record for audit trail
      const { data: commission, error: fetchError } = await supabaseAdmin
        .from('commission_logs')
        .select('*')
        .eq('id', commissionId)
        .single()

      if (fetchError || !commission) {
        throw new Error(`Commission log not found: ${commissionId}`)
      }

      // Create Stripe transfer to partner's connected account
      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: 'eur',
        destination: stripeAccountId,
        description: `Job payout - Inquiry ${commission.inquiry_id}`,
        metadata: {
          commission_id: commissionId,
          inquiry_id: commission.inquiry_id,
        },
      })

      // Update commission log with transfer info
      const { error: updateError } = await supabaseAdmin
        .from('commission_logs')
        .update({
          status: 'transferred',
          stripe_transfer_id: transfer.id,
          transferred_at: new Date().toISOString(),
          transfer_attempts: (commission.transfer_attempts || 0) + 1,
        })
        .eq('id', commissionId)

      if (updateError) {
        console.error('[CommissionService] Failed to update transfer:', updateError)
      }

      return {
        success: true,
        transferId: transfer.id,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      
      // Update with failure info
      await supabaseAdmin
        .from('commission_logs')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          last_error: errorMsg,
          last_attempted_at: new Date().toISOString(),
          transfer_attempts: (await supabaseAdmin
            .from('commission_logs')
            .select('transfer_attempts')
            .eq('id', commissionId)
            .single()
            .then(r => r.data?.transfer_attempts || 0)) + 1,
        })
        .eq('id', commissionId)

      console.error('[CommissionService] Transfer failed:', errorMsg)
      return {
        success: false,
        error: errorMsg,
      }
    }
  },

  /**
   * Retry failed transfers (called by cron job)
   * Attempts to re-transfer commissions that failed
   */
  async retryFailedTransfers() {
    const retryCutoffIso = new Date(Date.now() - 60 * 60 * 1000).toISOString()

    const { data: failedLogs, error } = await supabaseAdmin
      .from('commission_logs')
      .select('*')
      .eq('status', 'failed')
      .lt('transfer_attempts', 3)  // Max 3 attempts

    if (error) {
      console.error('[CommissionService] Failed to fetch failed transfers:', error)
      return { retried: 0, succeeded: 0, failed: 0 }
    }

    let succeeded = 0
    let failed = 0

    const eligibleLogs = (failedLogs || []).filter((log: any) => {
      if (!log.last_attempted_at) return true
      return new Date(log.last_attempted_at).toISOString() < retryCutoffIso
    })

    for (const log of eligibleLogs) {
      if (!log.stripe_account_id) {
        continue
      }

      const result = await this.transferToPartner(
        log.id,
        log.stripe_account_id,
        log.partner_payout_cents
      )

      if (result.success) {
        succeeded++
      } else {
        failed++
      }
    }

    return {
      retried: eligibleLogs.length,
      succeeded,
      failed,
    }
  },

  /**
   * Refund a commission if job is disputed/refunded
   */
  async refundCommission(commissionId: string) {
    const { data: commission, error: fetchError } = await supabaseAdmin
      .from('commission_logs')
      .select('*')
      .eq('id', commissionId)
      .single()

    if (fetchError || !commission) {
      throw new Error(`Commission log not found: ${commissionId}`)
    }

    // If already transferred, we'd need to reverse via Stripe
    // For now, just mark as refunded in DB
    const { error } = await supabaseAdmin
      .from('commission_logs')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        notes: 'Commission refunded due to job dispute/refund',
      })
      .eq('id', commissionId)

    if (error) {
      throw error
    }
  },

  /**
   * Get partner's commission summary
   */
  async getPartnerCommissions(partnerId: string, months?: number) {
    const fromDate = months
      ? new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date('2020-01-01').toISOString()

    const { data, error } = await supabaseAdmin
      .from('commission_logs')
      .select(
        `
        id,
        gross_amount_cents,
        commission_cents,
        partner_payout_cents,
        status,
        created_at,
        transferred_at
        `
      )
      .eq('partner_id', partnerId)
      .gte('created_at', fromDate)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Calculate summary stats
    const summary = {
      total_jobs: data?.length || 0,
      total_gross_eur: (data?.reduce((sum: any, log: any) => sum + log.gross_amount_cents, 0) || 0) / 100,
      total_commission_eur: (data?.reduce((sum: any, log: any) => sum + log.commission_cents, 0) || 0) / 100,
      total_payout_eur: (data?.reduce((sum: any, log: any) => sum + log.partner_payout_cents, 0) || 0) / 100,
      transferred_count: (data?.filter((log: any) => log.status === 'transferred').length || 0),
      pending_count: (data?.filter((log: any) => log.status === 'earned').length || 0),
      failed_count: (data?.filter((log: any) => log.status === 'failed').length || 0),
      logs: data || [],
    }

    return summary
  },

  /**
   * Get platform revenue summary
   */
  async getPlatformRevenue(months?: number) {
    const fromDate = months
      ? new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date('2020-01-01').toISOString()

    const { data, error } = await supabaseAdmin
      .from('commission_logs')
      .select('commission_cents, status, created_at')
      .gte('created_at', fromDate)

    if (error) {
      throw error
    }

    const revenue = {
      total_commission_eur: (data?.reduce((sum: any, log: any) => sum + log.commission_cents, 0) || 0) / 100,
      earned_commission_eur: (data
        ?.filter((log: any) => ['earned', 'transferred', 'refunded'].includes(log.status))
        .reduce((sum: any, log: any) => sum + log.commission_cents, 0) || 0) / 100,
      transferred_commission_eur: (data
        ?.filter((log: any) => log.status === 'transferred')
        .reduce((sum: any, log: any) => sum + log.commission_cents, 0) || 0) / 100,
      pending_commission_eur: (data
        ?.filter((log: any) => log.status === 'pending')
        .reduce((sum: any, log: any) => sum + log.commission_cents, 0) || 0) / 100,
      jobs_completed: data?.length || 0,
    }

    return revenue
  },
}
