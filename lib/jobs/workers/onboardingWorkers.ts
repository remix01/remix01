/**
 * Onboarding Job Workers
 *
 * Handles async jobs for both pipelines:
 *  - craftsman_discovery_triggered  → discover craftsmen via Google Maps
 *  - craftsman_invite_batch         → send invites to pending prospects
 *  - craftsman_invite_single        → invite one specific prospect
 *  - craftsman_verify               → run 4-step verification pipeline
 *  - supply_demand_rebalance        → calculate signals & trigger actions
 *  - draft_expiry_followup          → nudge visitors with expiring drafts
 */

import { Job } from '../queue'
import { discoverCraftsmen } from '@/lib/agents/onboarding/craftsman-discovery-agent'
import { invitePendingProspects, inviteProspect } from '@/lib/agents/onboarding/craftsman-invite'
import { runVerificationPipeline } from '@/lib/agents/onboarding/verification-pipeline'
import { createAdminClient } from '@/lib/supabase/server'
import { getResendClient, FROM_EMAIL } from '@/lib/resend'
import { env } from '@/lib/env'

const APP_URL = env.NEXT_PUBLIC_APP_URL

export async function handleCraftsmanDiscovery(job: Job): Promise<void> {
  const { city, countryCode, category, triggeredBy } = job.data as {
    city: string; countryCode: string; category?: string; triggeredBy?: string
  }

  console.log('[Worker:Discovery]', { city, countryCode, category, triggeredBy })

  const categories = category ? [category] : undefined
  const result = await discoverCraftsmen(city, countryCode, categories)

  console.log('[Worker:Discovery] Done', result)
}

export async function handleCraftsmanInviteBatch(job: Job): Promise<void> {
  const { countryCode, limit = 50 } = job.data as { countryCode?: string; limit?: number }

  console.log('[Worker:InviteBatch]', { countryCode, limit })

  const result = await invitePendingProspects(countryCode, limit)

  console.log('[Worker:InviteBatch] Done', result)
}

export async function handleCraftsmanInviteSingle(job: Job): Promise<void> {
  const { prospectId } = job.data as { prospectId: string }

  console.log('[Worker:InviteSingle]', { prospectId })

  const ok = await inviteProspect(prospectId)

  console.log('[Worker:InviteSingle]', ok ? 'sent' : 'failed', { prospectId })
}

export async function handleCraftsmanVerify(job: Job): Promise<void> {
  const { obrnikId, countryCode, ...rest } = job.data as Record<string, unknown>

  console.log('[Worker:Verify]', { obrnikId })

  const result = await runVerificationPipeline(obrnikId as string, {
    countryCode: (countryCode as string | undefined) ?? 'SI',
    ...rest,
  })

  console.log('[Worker:Verify] Done', {
    obrnikId,
    finalStatus: result.finalStatus,
    steps: result.steps.map(s => `${s.step}:${s.status}`),
  })
}

export async function handleSupplyDemandRebalance(job: Job): Promise<void> {
  const { countryCode = 'SI' } = job.data as { countryCode?: string }
  const supabase = createAdminClient()

  console.log('[Worker:Rebalance] Starting', { countryCode })

  const { data: locations } = await supabase
    .from('locations')
    .select('name')
    .eq('country_code', countryCode)
    .eq('is_active', true)

  if (!locations?.length) return

  for (const loc of locations) {
    const city = loc.name

    const { count: openTasks } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .in('status', ['open', 'has_ponudbe'])

    const { count: activeCraftsmen } = await supabase
      .from('obrtnik_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('city', city)
      .eq('is_verified', true)
      .eq('is_available', true)

    const open = openTasks ?? 0
    const supply = activeCraftsmen ?? 0

    await supabase.from('supply_demand_signals').insert({
      country_code:     countryCode,
      city,
      category:         'all',
      open_tasks:       open,
      active_craftsmen: supply,
    })

    const ratio = supply === 0 ? Infinity : open / supply

    if (ratio > 3 || supply === 0) {
      console.log('[Worker:Rebalance] Supply needed in', city)
      const { enqueue } = await import('../queue')
      await enqueue('craftsman_discovery_triggered', {
        city,
        countryCode,
        triggeredBy: 'rebalance',
      }, { retries: 2 })
    }
  }

  console.log('[Worker:Rebalance] Done', { countryCode, cities: locations.length })
}

export async function handleDraftExpiryFollowup(_job: Job): Promise<void> {
  const supabase = createAdminClient()
  const resend = getResendClient()

  if (!resend) {
    console.warn('[Worker:DraftExpiry] Resend not configured')
    return
  }

  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: expiring } = await supabase
    .from('task_drafts')
    .select('id, email, city, description')
    .eq('status', 'draft')
    .not('email', 'is', null)
    .lte('expires_at', tomorrow)
    .gt('expires_at', new Date().toISOString())

  if (!expiring?.length) {
    console.log('[Worker:DraftExpiry] No expiring drafts')
    return
  }

  let sent = 0
  for (const draft of expiring) {
    const continueUrl = `${APP_URL}/novo-povprasevanje?draft=${draft.id}`

    try {
      await resend.emails.send({
        from:    FROM_EMAIL,
        to:      [draft.email as string],
        subject: 'Vaše povpraševanje poteče jutri — dokončajte ga zdaj',
        html: `
          <p>Pozdravljeni,</p>
          <p>Vaše povpraševanje${draft.city ? ` v mestu <strong>${draft.city}</strong>` : ''} bo jutri poteklo.</p>
          ${draft.description ? `<blockquote>${draft.description}</blockquote>` : ''}
          <p>
            <a href="${continueUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">
              Dokončaj zdaj →
            </a>
          </p>
          <p>Ekipa LiftGO</p>
        `,
        text: `Dokončajte povpraševanje: ${continueUrl}`,
        tags: [{ name: 'type', value: 'draft_expiry_nudge' }],
      })
      sent++
    } catch (err) {
      console.warn('[Worker:DraftExpiry] Email failed', { draftId: draft.id, err })
    }
  }

  console.log('[Worker:DraftExpiry] Done', { sent, total: expiring.length })
}
