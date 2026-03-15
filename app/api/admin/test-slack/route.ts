/**
 * Admin API — Test Slack Webhook
 *
 * Sends a test message to Slack to verify the webhook is configured correctly.
 * Admin-only. Secured by CRON_SECRET or admin session.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    // Auth check — must be admin
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nepooblaščen dostop.' }, { status: 401 })

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Prepovedano.' }, { status: 403 })
    }

    const webhookUrl = process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'SLACK_WEBHOOK_URL ni nastavljen v okoljskih spremenljivkah.' },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: `Slack je vrnil napako: ${res.status} ${text}` },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, message: 'Test sporočilo poslano na Slack!' })
  } catch (err: any) {
    console.error('[test-slack] error:', err)
    return NextResponse.json({ error: err.message || 'Napaka pri pošiljanju.' }, { status: 500 })
  }
}
