// @ts-nocheck
/**
 * Worker Broadcast — Instant partner notifications
 *
 * Handles real-time broadcasts to matched partners via:
 * - Supabase in-app notifications (notifications table)
 * - Email notifications via Resend (with quiet hours)
 *
 * Respects quiet hours (22:00-07:00) except for urgent deadline warnings
 */

import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://liftgo.net'

export const workerBroadcast = {
  /**
   * Broadcast new request to top matched partners.
   * Creates in-app notification + sends email (respects quiet hours).
   * partnerIds = obrtnik_profile.id values
   */
  async notifyMatched(requestId: string, partnerIds: string[]): Promise<void> {
    if (!partnerIds.length) return

    const isQuietHours = this.isQuietHours()
    console.log(JSON.stringify({
      level: 'info',
      message: '[WorkerBroadcast] notifyMatched start',
      requestId,
      count: partnerIds.length,
      isQuietHours,
    }))

    try {
      const supabase = createAdminClient()

      // Fetch request details + partner user_ids in parallel
      const [{ data: request }, { data: obrtniki }] = await Promise.all([
        supabase
          .from('povprasevanja')
          .select('id, title, location_city, urgency')
          .eq('id', requestId)
          .single(),
        supabase
          .from('obrtnik_profiles')
          .select('id, user_id')
          .in('id', partnerIds),
      ])

      if (!obrtniki?.length) return

      const title = request?.title || 'Novo povpraševanje'
      const city = request?.location_city ? ` — ${request.location_city}` : ''
      const link = `/obrtnik/povprasevanja`

      // 1. Insert in-app notifications (batch)
      const notifications = obrtniki.map((o) => ({
        user_id: o.user_id,
        type: 'novo_povprasevanje',
        title: 'Novo povpraševanje v vaši kategoriji',
        message: `${title}${city}`,
        link,
        read: false,
        metadata: { povprasevanje_id: requestId },
      }))

      const { error: notifError } = await supabase.from('notifications').insert(notifications)
      if (notifError) {
        console.error(JSON.stringify({ level: 'error', message: '[WorkerBroadcast] notification insert error', error: notifError.message }))
      }

      // 2. Send emails (skip quiet hours)
      if (!isQuietHours) {
        const userIds = obrtniki.map((o) => o.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, full_name')
          .in('id', userIds)
        const profiles = profilesData as Array<{ id: string; email: string | null; full_name: string | null }> | null

        for (const profile of profiles || []) {
          if (!profile.email) continue
          await this.sendEmail({
            to: profile.email,
            name: profile.full_name || 'Obrtnik',
            subject: `Novo povpraševanje: ${title}`,
            html: `
              <h2>Novo povpraševanje v vaši kategoriji</h2>
              <p><strong>${title}</strong>${city}</p>
              <p>Prijavite se in oddajte ponudbo preden jo kdo drug prevzame.</p>
              <a href="${APP_URL}${link}" style="background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:12px">
                Ogled povpraševanja →
              </a>
            `,
          }).catch((err) => {
            console.error(JSON.stringify({ level: 'error', message: '[WorkerBroadcast] email failed', to: profile.email, error: String(err) }))
          })
        }
      }

      console.log(JSON.stringify({ level: 'info', message: '[WorkerBroadcast] notifyMatched done', requestId, count: partnerIds.length }))
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', message: '[WorkerBroadcast] notifyMatched error', requestId, error: String(error) }))
    }
  },

  /**
   * Urgent deadline warning — ignores quiet hours
   */
  async notifyDeadlineWarning(
    requestId: string,
    partnerIds: string[],
    minutesLeft: number
  ): Promise<void> {
    if (!partnerIds.length) return

    console.log(JSON.stringify({ level: 'info', message: '[WorkerBroadcast] deadline warning', requestId, minutesLeft }))

    try {
      const supabase = createAdminClient()

      const { data: obrtniki } = await supabase
        .from('obrtnik_profiles')
        .select('id, user_id')
        .in('id', partnerIds)

      if (!obrtniki?.length) return

      const notifications = obrtniki.map((o) => ({
        user_id: o.user_id,
        type: 'rok_izteka',
        title: `Rok se izteka — še ${minutesLeft} minut!`,
        message: 'Oddajte ponudbo preden poteče rok za to povpraševanje.',
        link: '/obrtnik/povprasevanja',
        read: false,
        metadata: { povprasevanje_id: requestId, minutes_left: minutesLeft },
      }))

      await supabase.from('notifications').insert(notifications)

      const userIds = obrtniki.map((o) => o.user_id)
      const { data: profilesData2 } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds)
      const profiles2 = profilesData2 as Array<{ id: string; email: string | null; full_name: string | null }> | null

      for (const profile of profiles2 || []) {
        if (!profile.email) continue
        await this.sendEmail({
          to: profile.email,
          name: profile.full_name || 'Obrtnik',
          subject: `⏰ Rok se izteka — še ${minutesLeft} minut`,
          html: `
            <h2>Rok za oddajo ponudbe se izteka!</h2>
            <p>Imate še <strong>${minutesLeft} minut</strong> za oddajo ponudbe.</p>
            <a href="${APP_URL}/obrtnik/povprasevanja" style="background:#dc2626;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin-top:12px">
              Oddaj ponudbo zdaj →
            </a>
          `,
        }).catch(() => {})
      }
    } catch (error) {
      console.error(JSON.stringify({ level: 'error', message: '[WorkerBroadcast] deadline warning error', requestId, error: String(error) }))
    }
  },

  /**
   * Send transactional email via Resend
   */
  async sendEmail(params: { to: string; name: string; subject: string; html: string }): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[WorkerBroadcast] RESEND_API_KEY not set, skipping email')
      return
    }
    await resend.emails.send({
      from: 'LiftGO <info@liftgo.net>',
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
  },

  /**
   * Quiet hours check (22:00–07:00)
   */
  isQuietHours(): boolean {
    const hour = new Date().getHours()
    return hour >= 22 || hour < 7
  },
}
