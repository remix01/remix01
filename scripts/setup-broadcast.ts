#!/usr/bin/env tsx
import 'dotenv/config'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

type ScriptMode = 'invite-testers' | 'onboarding-flow' | 'broadcast-inactive' | 'sync-audience'

type Contact = {
  id?: string
  email: string
  full_name?: string | null
  role?: string | null
  last_active_at?: string | null
}

const DEFAULT_FROM = 'LiftGO <noreply@liftgo.net>'
const DEFAULT_REPLY_TO = 'support@liftgo.net'
const RESEND_API_BASE = 'https://api.resend.com'

function getArg(name: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(`--${flag}`)
}

function toMode(value: string | undefined): ScriptMode {
  const normalized = (value || 'invite-testers') as ScriptMode
  const supported: ScriptMode[] = ['invite-testers', 'onboarding-flow', 'broadcast-inactive', 'sync-audience']
  if (!supported.includes(normalized)) {
    throw new Error(`Unsupported mode: ${value}. Supported: ${supported.join(', ')}`)
  }
  return normalized
}

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

function toIsoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function resendApi(path: string, method: 'POST' | 'PUT', body: Record<string, unknown>) {
  const apiKey = requireEnv('RESEND_API_KEY')

  const response = await fetch(`${RESEND_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`[Resend ${method} ${path}] ${response.status}: ${text}`)
  }

  return response.json()
}

function buildInviteHtml(name: string): string {
  const safeName = escapeHtml(name)
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;background:#ffffff;color:#0f172a;">
      <h1 style="margin:0 0 12px;color:#0f766e;">Dobrodošli med LiftGO testerje 🚀</h1>
      <p style="font-size:15px;line-height:1.6;">Pozdravljeni ${safeName},</p>
      <p style="font-size:15px;line-height:1.6;">
        hvala, ker pomagate testirati LiftGO. Vaše povratne informacije so ključne za stabilen launch.
      </p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:14px 16px;margin:16px 0;">
        <p style="margin:0 0 8px;"><strong>Kako začeti:</strong></p>
        <ul style="margin:0;padding-left:18px;line-height:1.7;">
          <li>Prijavite se v aplikacijo</li>
          <li>Oddajte testno povpraševanje</li>
          <li>Ocenite uporabniško izkušnjo (hitrost, jasnost, napake)</li>
        </ul>
      </div>
      <p style="font-size:15px;line-height:1.6;">Za pomoč odgovorite na ta email ali pišite na support@liftgo.net.</p>
      <p style="font-size:14px;color:#64748b;margin-top:20px;">Ekipa LiftGO</p>
    </div>
  `
}

async function getSupabaseContacts(limit: number, role?: string, inactiveDays?: number): Promise<Contact[]> {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const key = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  const supabase = createClient(url, key)

  let query = supabase
    .from('profiles')
    .select('id,email,full_name,role,updated_at')
    .not('email', 'is', null)
    .order('created_at', { ascending: true })
    .limit(limit)

  if (role) {
    query = query.eq('role', role)
  }

  if (inactiveDays && inactiveDays > 0) {
    query = query.lt('updated_at', toIsoDaysAgo(inactiveDays))
  }

  const { data, error } = await query
  if (error) throw new Error(`[Supabase] ${error.message}`)

  return (data || []).map((item: any) => ({
    id: item.id,
    email: item.email,
    full_name: item.full_name,
    role: item.role,
    last_active_at: item.updated_at,
  }))
}

async function inviteTesters(params: { limit: number; dryRun: boolean }) {
  const resend = new Resend(requireEnv('RESEND_API_KEY'))
  const recipients = await getSupabaseContacts(params.limit)

  if (recipients.length === 0) {
    console.log('[setup-broadcast] No tester contacts found in profiles.email')
    return
  }

  console.log(`[setup-broadcast] Found ${recipients.length} recipients (showing up to ${params.limit})`)

  for (const recipient of recipients) {
    const to = recipient.email
    const subject = 'Povabilo v LiftGO testno skupino'
    const html = buildInviteHtml(recipient.full_name || 'tester')

    if (params.dryRun) {
      console.log(`[dry-run] Would send invite to ${to}`)
      continue
    }

    const response = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [to],
      replyTo: DEFAULT_REPLY_TO,
      subject,
      html,
      tags: [{ name: 'campaign', value: 'tester-invite' }],
    })

    if (response.error) {
      console.error('[setup-broadcast] Invite send error', { to, error: response.error.message })
    } else {
      console.log('[setup-broadcast] Invite sent', { to, id: response.data?.id })
    }
  }
}

async function createOnboardingAutomation(params: { audienceId: string; dryRun: boolean }) {
  const payload = {
    name: 'LiftGO Onboarding Flow',
    audience_id: params.audienceId,
    trigger: { event: 'user.registered' },
    steps: [
      { delay: '0m', action: 'send_email', template: 'welcome_day_0' },
      { delay: '1d', action: 'send_email', template: 'welcome_day_1' },
      { delay: '3d', action: 'send_email', template: 'welcome_day_3' },
    ],
  }

  if (params.dryRun) {
    console.log('[dry-run] Would create automation', payload)
    return
  }

  const result = await resendApi('/automations', 'POST', payload)
  console.log('[setup-broadcast] Automation created', result)
}

async function sendOnboardingEvent(params: { eventName: string; userEmail: string; userId: string; dryRun: boolean }) {
  const payload = {
    name: params.eventName,
    data: {
      user_id: params.userId,
      email: params.userEmail,
      source: 'setup-broadcast.ts',
    },
  }

  if (params.dryRun) {
    console.log('[dry-run] Would send onboarding event', payload)
    return
  }

  const result = await resendApi('/events', 'POST', payload)
  console.log('[setup-broadcast] Event sent', result)
}

async function broadcastInactive(params: { limit: number; inactiveDays: number; dryRun: boolean }) {
  const resend = new Resend(requireEnv('RESEND_API_KEY'))
  const contacts = await getSupabaseContacts(params.limit, 'obrtnik', params.inactiveDays)

  console.log(`[setup-broadcast] Found ${contacts.length} inactive contractors (${params.inactiveDays}+ days)`) 

  for (const contact of contacts) {
    if (params.dryRun) {
      console.log(`[dry-run] Would send reactivation broadcast to ${contact.email}`)
      continue
    }

    const response = await resend.emails.send({
      from: DEFAULT_FROM,
      to: [contact.email],
      replyTo: DEFAULT_REPLY_TO,
      subject: 'Pogrešamo vas na LiftGO – nove priložnosti čakajo',
      html: `
        <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;">
          <h2 style="margin:0 0 12px;color:#0f766e;">Pozdravljeni ${escapeHtml(contact.full_name || 'partner')} 👋</h2>
          <p>Zadnjih ${params.inactiveDays} dni vas nismo zaznali v aplikaciji.</p>
          <p>Vrnite se in preverite nova povpraševanja v vaši regiji.</p>
        </div>
      `,
      tags: [{ name: 'campaign', value: 'inactive-7-days' }],
    })

    if (response.error) {
      console.error('[setup-broadcast] Reactivation send error', { email: contact.email, error: response.error.message })
    } else {
      console.log('[setup-broadcast] Reactivation sent', { email: contact.email, id: response.data?.id })
    }
  }
}

async function syncAudienceFromSupabase(params: { audienceId: string; limit: number; dryRun: boolean }) {
  const contacts = await getSupabaseContacts(params.limit)

  if (contacts.length === 0) {
    console.log('[setup-broadcast] No contacts to sync')
    return
  }

  for (const contact of contacts) {
    const payload = {
      email: contact.email,
      first_name: contact.full_name || undefined,
      unsubscribed: false,
    }

    if (params.dryRun) {
      console.log('[dry-run] Would upsert audience contact', payload)
      continue
    }

    await resendApi(`/audiences/${params.audienceId}/contacts`, 'POST', payload)
    console.log('[setup-broadcast] Synced contact', { audienceId: params.audienceId, email: contact.email })
  }
}

async function main() {
  const mode = toMode(process.argv[2])
  const dryRun = hasFlag('dry-run')
  const limit = Number(getArg('limit') || '30')
  const audienceId = getArg('audience-id') || process.env.RESEND_AUDIENCE_ID || ''

  if (mode === 'invite-testers') {
    if (limit < 20 || limit > 50) {
      throw new Error('For tester invites use --limit between 20 and 50')
    }
    await inviteTesters({ limit, dryRun })
    return
  }

  if (mode === 'onboarding-flow') {
    if (!audienceId) throw new Error('Missing --audience-id (or RESEND_AUDIENCE_ID) for onboarding flow')
    const sampleUserEmail = getArg('user-email') || process.env.SEED_USER_EMAIL || ''
    const sampleUserId = getArg('user-id') || process.env.SEED_USER_ID || 'seed-user'

    await createOnboardingAutomation({ audienceId, dryRun })
    if (sampleUserEmail) {
      await sendOnboardingEvent({
        eventName: getArg('event') || 'user.registered',
        userEmail: sampleUserEmail,
        userId: sampleUserId,
        dryRun,
      })
    }
    return
  }

  if (mode === 'broadcast-inactive') {
    await broadcastInactive({
      limit,
      inactiveDays: Number(getArg('inactive-days') || '7'),
      dryRun,
    })
    return
  }

  if (!audienceId) throw new Error('Missing --audience-id (or RESEND_AUDIENCE_ID) for audience sync')

  await syncAudienceFromSupabase({ audienceId, limit, dryRun })
}

main().catch((error) => {
  console.error('[setup-broadcast] Failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
