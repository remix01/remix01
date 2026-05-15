import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  LeadStatus,
  LEAD_TRANSITIONS,
  LEAD_TERMINAL,
  LEAD_STATUS_MIGRATION,
} from '@/lib/state-machine/statuses'
import { assertTransitionValid, TransitionError } from '@/lib/state-machine/transition'

/**
 * LEAD STATE MACHINE
 *
 * Governs `obrtnik_profiles.profile_status` for the admin lead pipeline.
 *
 * lead → qualified → claimed → active → inactive
 *                 ↘ active          ↗
 *                 ↘ rejected (TERMINAL)
 */
export async function assertLeadTransition(
  leadId: string,
  targetStatus: string,
): Promise<void> {
  const { data: lead, error } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('profile_status')
    .eq('id', leadId)
    .maybeSingle()

  if (error) {
    console.error('[STATE-MACHINE] DB error fetching lead:', error)
    throw { code: 500, error: 'Failed to verify lead state' }
  }

  if (!lead) {
    throw { code: 404, error: `Lead ${leadId} not found` }
  }

  const rawStatus = lead.profile_status as string
  const currentStatus = (LEAD_STATUS_MIGRATION[rawStatus] ?? rawStatus) as LeadStatus
  const target = (LEAD_STATUS_MIGRATION[targetStatus] ?? targetStatus) as LeadStatus

  try {
    assertTransitionValid(currentStatus, target, LEAD_TRANSITIONS, LEAD_TERMINAL)
  } catch (err) {
    if (err instanceof TransitionError) {
      console.warn(
        `[STATE-MACHINE] Rejected: lead ${leadId} transition ${currentStatus} → ${target} (${err.reason})`,
      )
      await logRejectedTransition(leadId, currentStatus, target, err.reason)
      throw { code: err.code, error: err.message }
    }
    throw err
  }

  console.log(`[STATE-MACHINE] Valid lead transition: ${currentStatus} → ${target}`)
}

async function logRejectedTransition(
  leadId: string,
  currentStatus: string,
  targetStatus: string,
  reason: string,
): Promise<void> {
  try {
    await supabaseAdmin.from('escrow_audit_log').insert({
      transaction_id: leadId,
      event_type: 'transition_rejected',
      actor: 'system',
      actor_id: 'state-machine',
      status_before: currentStatus,
      status_after: targetStatus,
      metadata: { reason, resource: 'lead' },
    } as any)
  } catch (err) {
    console.error('[STATE-MACHINE] Failed to log rejected lead transition:', err)
  }
}
