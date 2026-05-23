import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCronGuard, cronWindow } from '@/lib/cron/cronGuard'

function verifyCron(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[cron/detect-anomalies] CRON_SECRET not configured in production — request denied')
      return false
    }
    return true
  }
  return req.headers.get('authorization') === `Bearer ${secret}`
}

// Safe upper bounds — prevents full-table scans loading unbounded rows into memory.
const PONUDBE_SCAN_LIMIT = 1000
const MESSAGE_SCAN_LIMIT = 500
const OFFER_SPIKE_THRESHOLD = 10

export async function GET(req: Request) {
  if (!verifyCron(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const start = Date.now()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [highOfferUsers, suspiciousMessages, existingAlerts] = await Promise.all([
    supabaseAdmin
      .from('ponudbe')
      .select('obrtnik_id, created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(PONUDBE_SCAN_LIMIT),
    supabaseAdmin
      .from('message')
      .select('id, body, sender_user_id, created_at')
      .gte('created_at', since)
      .or('body.ilike.%@%,body.ilike.%+386%,body.ilike.%http%')
      .order('created_at', { ascending: false })
      .limit(MESSAGE_SCAN_LIMIT),
    // Fetch open alerts already created in this 24h window to avoid duplicates.
    // The cron runs hourly; without this, the same anomaly triggers a new alert each run.
    supabaseAdmin
      .from('admin_alerts')
      .select('type, metadata')
      .eq('status', 'open')
      .gte('created_at', since)
      .in('type', ['offer_spike', 'off_platform_contact']),
  ])

  // Build deduplication sets from already-open alerts
  const seenOfferSpikes = new Set<string>()
  const seenContactAlerts = new Set<string>()
  for (const alert of existingAlerts.data ?? []) {
    if (alert.type === 'offer_spike') seenOfferSpikes.add(alert.metadata?.userId)
    else if (alert.type === 'off_platform_contact') seenContactAlerts.add(alert.metadata?.messageId)
  }

  const offerCounts = (highOfferUsers.data || []).reduce((acc: Record<string, number>, row: any) => {
    acc[row.obrtnik_id] = (acc[row.obrtnik_id] || 0) + 1
    return acc
  }, {})

  const alerts: any[] = []

  Object.entries(offerCounts).forEach(([userId, count]) => {
    if (count > OFFER_SPIKE_THRESHOLD && !seenOfferSpikes.has(userId)) {
      alerts.push({
        type: 'offer_spike',
        severity: 'high',
        title: 'Nenaden porast ponudb',
        message: `Uporabnik ${userId} je oddal ${count} ponudb v zadnjih 24h.`,
        metadata: { userId, count },
      })
    }
  })

  for (const msg of suspiciousMessages.data || []) {
    if (!seenContactAlerts.has(msg.id)) {
      alerts.push({
        type: 'off_platform_contact',
        severity: 'medium',
        title: 'Možen poskus off-platform komunikacije',
        message: `Sporočilo ${msg.id} vsebuje kontaktne podatke ali link.`,
        metadata: { messageId: msg.id, userId: msg.sender_user_id },
      })
    }
  }

  let inserted = 0
  if (alerts.length > 0) {
    const { error } = await supabaseAdmin.from('admin_alerts').insert(alerts)
    if (error) {
      console.error('[cron/detect-anomalies] Failed to insert alerts:', error.message)
    } else {
      inserted = alerts.length
    }
  }

  console.log(JSON.stringify({
    level: 'info',
    message: '[detect-anomalies] complete',
    ponudbe_scanned: highOfferUsers.data?.length ?? 0,
    messages_scanned: suspiciousMessages.data?.length ?? 0,
    alerts_skipped_dedup: (alerts.length + seenOfferSpikes.size + seenContactAlerts.size) - inserted,
    inserted,
    durationMs: Date.now() - start,
  }))

  return NextResponse.json({ success: true, inserted })
}
