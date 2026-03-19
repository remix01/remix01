/**
 * app/api/slack/route.ts
 * Internal admin-only Slack API endpoint.
 * Auth: checks admin_users table via supabaseAdmin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendMessage,
  sendBusinessEvent,
  sendAlert,
  readMessages,
  readThread,
  listChannels,
  type BusinessEventType,
  type SlackSeverity,
} from '@/lib/slack'

async function isAdmin(req: NextRequest): Promise<boolean> {
  const supabase = createAdminClient()
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return false
  const token = authHeader.replace('Bearer ', '')
  const { data } = await supabase.auth.getUser(token)
  if (!data.user) return false
  const { data: adminRow } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', data.user.id)
    .single()
  return !!adminRow
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { action } = body

  try {
    switch (action) {
      case 'send_message': {
        const result = await sendMessage({ channel: body.channel, text: body.text, threadTs: body.thread_ts })
        return NextResponse.json(result)
      }
      case 'send_business_event': {
        await sendBusinessEvent({ event: body.event as BusinessEventType, title: body.title, details: body.details, link: body.link })
        return NextResponse.json({ ok: true })
      }
      case 'send_alert': {
        await sendAlert({ type: body.type, severity: body.severity as SlackSeverity, message: body.message, metadata: body.metadata })
        return NextResponse.json({ ok: true })
      }
      case 'read_messages': {
        const messages = await readMessages({ channel: body.channel, limit: body.limit, oldest: body.oldest, latest: body.latest })
        return NextResponse.json({ ok: true, messages })
      }
      case 'read_thread': {
        const messages = await readThread({ channel: body.channel, threadTs: body.thread_ts, limit: body.limit })
        return NextResponse.json({ ok: true, messages })
      }
      case 'list_channels': {
        const channels = await listChannels()
        return NextResponse.json({ ok: true, channels })
      }
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err) {
    console.error('[/api/slack] Error:', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
