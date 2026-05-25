/**
 * Craftsman Invite Agent
 *
 * Sends personalised invitation emails to discovered prospects via Resend.
 * Uses AI to generate localised copy per country/category.
 */

import { createAdminClient } from '@/lib/supabase/server'
import { executeAgent } from '@/lib/ai/orchestrator'
import { getResendClient, FROM_EMAIL } from '@/lib/resend'
import { env } from '@/lib/env'

const APP_URL = env.NEXT_PUBLIC_APP_URL

interface InviteContext {
  businessName: string
  contactName?: string | null
  city: string
  categories: string[]
  countryCode: string
  locale: string
  inviteToken: string
}

async function generateInviteCopy(ctx: InviteContext): Promise<{
  subject: string
  bodyHtml: string
  bodyText: string
}> {
  const categoryList = ctx.categories.join(', ')
  const langName = ctx.locale === 'sl' ? 'Slovenian' : ctx.locale === 'de' ? 'German' : ctx.locale === 'hr' ? 'Croatian' : 'English'
  const registrationUrl = `${APP_URL}/registracija?token=${ctx.inviteToken}&src=discovery`

  const userMessage = `Write a short, warm invitation email in ${langName} for:
Business: ${ctx.businessName}
${ctx.contactName ? `Contact: ${ctx.contactName}` : ''}
City: ${ctx.city}
Services: ${categoryList}
Registration link: ${registrationUrl}

Return ONLY valid JSON: { "subject": "...", "bodyHtml": "...", "bodyText": "..." }`

  try {
    const result = await executeAgent({
      agentType:    'onboarding_assistant',
      userId:       'system',
      userMessage,
      systemPromptOverride: 'You are a friendly outreach specialist for LiftGO. Generate email copy. Return only JSON.',
    })

    return JSON.parse(result.response)
  } catch {
    return {
      subject:  `${ctx.businessName} — Pridružite se LiftGO platformi`,
      bodyHtml: `
        <p>Pozdravljeni${ctx.contactName ? ` ${ctx.contactName}` : ''},</p>
        <p>Odkrili smo vaše podjetje <strong>${ctx.businessName}</strong> v mestu ${ctx.city} in menimo, da bi bila platforma LiftGO odlična priložnost za vas.</p>
        <p>LiftGO je slovensko tržišče domačih storitev, kjer stranke iščejo zanesljive izvajalce. Registracija je brezplačna.</p>
        <p><a href="${registrationUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px">Registrirajte se brezplačno →</a></p>
        <p>S spoštovanjem,<br>Ekipa LiftGO</p>
      `,
      bodyText: `Pozdravljeni, vabimo vas k registraciji na LiftGO: ${registrationUrl}`,
    }
  }
}

export async function inviteProspect(prospectId: string): Promise<boolean> {
  const supabase = createAdminClient()
  const resend = getResendClient()

  if (!resend) {
    console.warn('[Invite] Resend not configured')
    return false
  }

  const { data: prospect } = await supabase
    .from('craftsman_prospects')
    .select('*')
    .eq('id', prospectId)
    .single()

  if (!prospect) {
    console.error('[Invite] Prospect not found', prospectId)
    return false
  }

  if (!prospect.email) {
    console.warn('[Invite] No email for prospect', prospectId)
    return false
  }

  if (prospect.status !== 'discovered') {
    console.warn('[Invite] Prospect already processed', { id: prospectId, status: prospect.status })
    return false
  }

  const { data: country } = await supabase
    .from('countries')
    .select('locale')
    .eq('code', prospect.country_code)
    .single()

  const ctx: InviteContext = {
    businessName: prospect.business_name,
    contactName:  prospect.contact_name,
    city:         prospect.city,
    categories:   prospect.categories,
    countryCode:  prospect.country_code,
    locale:       country?.locale ?? 'sl',
    inviteToken:  prospect.invite_token,
  }

  const copy = await generateInviteCopy(ctx)

  try {
    await resend.emails.send({
      from:    FROM_EMAIL,
      to:      [prospect.email],
      subject: copy.subject,
      html:    copy.bodyHtml,
      text:    copy.bodyText,
      tags: [
        { name: 'type',     value: 'craftsman_invite' },
        { name: 'prospect', value: prospectId },
        { name: 'country',  value: prospect.country_code },
      ],
    })

    await supabase
      .from('craftsman_prospects')
      .update({ status: 'invited', invited_at: new Date().toISOString() })
      .eq('id', prospectId)

    console.log('[Invite] Sent to', prospect.email, { prospectId })
    return true
  } catch (err) {
    console.error('[Invite] Resend error', err)
    return false
  }
}

export async function invitePendingProspects(
  countryCode?: string,
  limit = 50,
): Promise<{ sent: number; failed: number }> {
  const supabase = createAdminClient()

  let query = supabase
    .from('craftsman_prospects')
    .select('id')
    .eq('status', 'discovered')
    .not('email', 'is', null)
    .order('ai_quality_score', { ascending: false })
    .limit(limit)

  if (countryCode) {
    query = query.eq('country_code', countryCode)
  }

  const { data: prospects } = await query

  let sent = 0
  let failed = 0

  for (const p of prospects ?? []) {
    const ok = await inviteProspect(p.id)
    if (ok) sent++
    else failed++
  }

  return { sent, failed }
}
