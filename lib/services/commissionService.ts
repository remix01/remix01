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

export type CommissionStatus =
  | 'pending' | 'earned' | 'transferred' | 'failed' | 'refunded'

export type SubscriptionTier = 'START' | 'PRO' | 'ELITE'

const COMMISSION_RATES: Record<SubscriptionTier, number> = {
  START: 0.10,
  PRO: 0.05,
  ELITE: 0.00,
}

export function getCommissionRate(tier: SubscriptionTier): number {
  return COMMISSION_RATES[tier]
}

interface CommissionLogParams {
  escrowId: string
  partnerId: string
  tier: SubscriptionTier
  inquiryId?: string
  grossAmountCents: number
  stripeAccountId?: string
}

interface TransferResult {
  success: boolean
  transferId?: string
  error?: string
}

interface CommissionRow {
  id: string
  gross_amount_cents: number
  commission_cents: number
  partner_payout_cents: number
  status: CommissionStatus
  created_at: string
  transferred_at: string | null
}

interface TransferRow {
  inquiry_id: string | null
  transfer_attempts: number | null
}

export const commissionService = {
  /**
   * Create a commission log when job is completed.
   * Called after escrow payment is captured and job marked complete.
   */
  async createCommissionLog(params: CommissionLogParams) {
    const commissionRate = getCommissionRate(params.tier)
    const commissionCents = Math.round(params.grossAmountCents * commissionRate)
    const partnerPayoutCents = params.grossAmountCents - commissionCents

    const { data, error } = await supabaseAdmin
      .from('commission_logs')
      .insert({
        escrow_id: params.escrowId,
        partner_id: params.partnerId,
        inquiry_id: params.inquiryId,
        gross_amount_cents: params.grossAmountCents,
        commission_rate: commissionRate,
        commission_cents: commissionCents,
        partner_payout_cents: partnerPayoutCents,
        stripe_account_id: params.stripeAccountId,
        status: 'earned',
        captured_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('[CommissionService] Failed to create log:', error)
      throw error
    }

    return {
      id: data.id,
      commission: commissionCents / 100,
      payout: partnerPayoutCents / 100,
    }
  },

  /**
   * Transfer commission payout to partner's Stripe connected account.
   * Uses Stripe Connect for marketplace transfers.
   */
  async transferToPartner(
    commissionId: string,
    stripeAccountId: string,
    amountCents: number
  ): Promise<TransferResult> {
    // Declared outside try so catch can read transfer_attempts without a second query
    let row: TransferRow | null = null

    try {
      const { data, error: fetchError } = await supabaseAdmin
        .from('commission_logs')
        .select('inquiry_id, transfer_attempts')
        .eq('id', commissionId)
        .single()

      if (fetchError || !data) {
        throw new Error(`Commission log not found: ${commissionId}`)
      }
      row = data

      const transfer = await stripe.transfers.create({
        amount: amountCents,
        currency: 'eur',
        destination: stripeAccountId,
        description: `Job payout - Inquiry ${row.inquiry_id}`,
        metadata: {
          commission_id: commissionId,
          inquiry_id: row.inquiry_id ?? '',
        },
      })

      const { error: updateError } = await supabaseAdmin
        .from('commission_logs')
        .update({
          status: 'transferred',
          stripe_transfer_id: transfer.id,
          transferred_at: new Date().toISOString(),
          transfer_attempts: (row.transfer_attempts ?? 0) + 1,
        })
        .eq('id', commissionId)

      if (updateError) {
        console.error('[CommissionService] Failed to update transfer:', updateError)
      }

      return { success: true, transferId: transfer.id }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)

      await supabaseAdmin
        .from('commission_logs')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          last_error: errorMsg,
          last_attempted_at: new Date().toISOString(),
          transfer_attempts: (row?.transfer_attempts ?? 0) + 1,
        })
        .eq('id', commissionId)

      console.error('[CommissionService] Transfer failed:', errorMsg)
      return { success: false, error: errorMsg }
    }
  },

  /**
   * Retry failed transfers (called by cron job).
   * Attempts to re-transfer commissions that failed up to 3 times.
   */
  async retryFailedTransfers() {
    const { data: failedLogs, error } = await supabaseAdmin
      .from('commission_logs')
      .select('id, stripe_account_id, partner_payout_cents, transfer_attempts')
      .eq('status', 'failed')
      .lt('transfer_attempts', 3)
      .lt('last_attempted_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())

    if (error) {
      console.error('[CommissionService] Failed to fetch failed transfers:', error)
      return { retried: 0, succeeded: 0, failed: 0 }
    }

    let succeeded = 0
    let failed = 0

    for (const log of failedLogs ?? []) {
      if (!log.stripe_account_id) continue

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

    return { retried: failedLogs?.length ?? 0, succeeded, failed }
  },

  /**
   * Refund a commission if job is disputed/refunded.
   */
  async refundCommission(commissionId: string) {
    const { data: commission, error: fetchError } = await supabaseAdmin
      .from('commission_logs')
      .select('id')
      .eq('id', commissionId)
      .single()

    if (fetchError || !commission) {
      throw new Error(`Commission log not found: ${commissionId}`)
    }

    const { error } = await supabaseAdmin
      .from('commission_logs')
      .update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        notes: 'Commission refunded due to job dispute/refund',
      })
      .eq('id', commissionId)

    if (error) throw error
  },

  /**
   * Get partner's commission summary.
   */
  async getPartnerCommissions(partnerId: string, months?: number) {
    const fromDate = months
      ? new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date('2020-01-01').toISOString()

    const { data, error } = await supabaseAdmin
      .from('commission_logs')
      .select(`
        id,
        gross_amount_cents,
        commission_cents,
        partner_payout_cents,
        status,
        created_at,
        transferred_at
      `)
      .eq('partner_id', partnerId)
      .gte('created_at', fromDate)
      .order('created_at', { ascending: false })

    if (error) throw error

    const logs = (data ?? []) as CommissionRow[]

    return {
      total_jobs: logs.length,
      total_gross_eur: logs.reduce((sum, l) => sum + l.gross_amount_cents, 0) / 100,
      total_commission_eur: logs.reduce((sum, l) => sum + l.commission_cents, 0) / 100,
      total_payout_eur: logs.reduce((sum, l) => sum + l.partner_payout_cents, 0) / 100,
      transferred_count: logs.filter(l => l.status === 'transferred').length,
      pending_count: logs.filter(l => l.status === 'earned').length,
      failed_count: logs.filter(l => l.status === 'failed').length,
      logs,
    }
  },

  /**
   * Get platform revenue summary.
   */
  async getPlatformRevenue(months?: number) {
    const fromDate = months
      ? new Date(Date.now() - months * 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date('2020-01-01').toISOString()

    const { data, error } = await supabaseAdmin
      .from('commission_logs')
      .select('commission_cents, status, created_at')
      .gte('created_at', fromDate)

    if (error) throw error

    type RevenueRow = Pick<CommissionRow, 'commission_cents' | 'status' | 'created_at'>
    const logs = (data ?? []) as RevenueRow[]
    const earnedStatuses: CommissionStatus[] = ['earned', 'transferred', 'refunded']

    return {
      total_commission_eur: logs.reduce((sum, l) => sum + l.commission_cents, 0) / 100,
      earned_commission_eur: logs
        .filter(l => earnedStatuses.includes(l.status))
        .reduce((sum, l) => sum + l.commission_cents, 0) / 100,
      transferred_commission_eur: logs
        .filter(l => l.status === 'transferred')
        .reduce((sum, l) => sum + l.commission_cents, 0) / 100,
      pending_commission_eur: logs
        .filter(l => l.status === 'pending')
        .reduce((sum, l) => sum + l.commission_cents, 0) / 100,
      jobs_completed: logs.length,
    }
  },
}
