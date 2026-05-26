import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { withCronGuard, cronWindow } from '@/lib/cron/cronGuard'

// Half-day window (11.5h TTL) prevents duplicate alert inserts if the route is
// invoked manually or if the cron entry is re-enabled in vercel.json.
export const GET = withCronGuard(
  {
    jobName: 'detect-anomalies',
    lockTtlSeconds: 120,
    windowKey: cronWindow.halfDay,
    windowTtlSeconds: 41400,
  },
  async (_req: NextRequest) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [highOfferUsers, suspiciousMessages] = await Promise.all([
    supabaseAdmin
      .from('ponudbe')
      .select('obrtnik_id, created_at')
      .gte('created_at', since),
    supabaseAdmin
      .from('message')
      .select('id, body, sender_user_id, created_at')
      .gte('created_at', since)
      .or('body.ilike.%@%,body.ilike.%+386%,body.ilike.%http%'),
  ])

  const offerCounts = (highOfferUsers.data || []).reduce((acc: Record<string, number>, row: any) => {
    acc[row.obrtnik_id] = (acc[row.obrtnik_id] || 0) + 1
    return acc
  }, {})

  const alerts: any[] = []

  Object.entries(offerCounts).forEach(([userId, count]) => {
    if (count > 10) {
      alerts.push({
        alert_type: 'offer_spike',
        severity: 'high',
        title: 'Nenaden porast ponudb',
        description: `Uporabnik ${userId} je oddal ${count} ponudb v zadnjih 24h.`,
        metadata: { userId, count },
      })
    }
  })

  for (const msg of suspiciousMessages.data || []) {
    alerts.push({
      alert_type: 'off_platform_contact',
      severity: 'medium',
      title: 'Možen poskus off-platform komunikacije',
      description: `Sporočilo ${msg.id} vsebuje kontaktne podatke ali link.`,
      metadata: { messageId: msg.id, userId: msg.sender_user_id },
    })
  }

  if (alerts.length > 0) {
    await supabaseAdmin.from('admin_alerts').insert(alerts)
  }

  return NextResponse.json({ success: true, inserted: alerts.length })
  },
)
