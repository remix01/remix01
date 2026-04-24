/**
 * Admin API — Test Slack Webhook
 *
 * Sends a test message to Slack to verify the webhook is configured correctly.
 * Admin-only. Secured by CRON_SECRET or admin session.
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ok, fail } from '@/lib/http/response'

export async function POST(req: NextRequest) {
  try {
    // Auth check — must be admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return fail('Nepooblaščen dostop.', 401)

    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin_users')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('aktiven', true)
      .maybeSingle()

    if (adminError || !admin) {
      return fail('Prepovedano.', 403)
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return fail('SLACK_WEBHOOK_URL ni nastavljen v okoljskih spremenljivkah.', 400)
    }

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: '✅ *LiftGO — Test sporočilo*\nSlack webhook deluje pravilno! 🎉',
        attachments: [
          {
            color: '#22c55e',
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `✅ *LiftGO Slack integracija deluje!*\nAdmin: ${user.email}\nČas: ${new Date().toLocaleString('sl-SI')}`,
                },
              },
            ],
          },
        ],
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      return fail(`Slack je vrnil napako: ${res.status} ${text}`, 502)
    }

    return ok({ success: true, message: 'Test sporočilo poslano na Slack!' })
  } catch (err: any) {
    console.error('[test-slack] error:', err)
    return fail(err.message || 'Napaka pri pošiljanju.', 500)
  }
}
