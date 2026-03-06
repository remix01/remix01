import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import {
  sendNewRequestMatchedNotification,
  sendResponseDeadline90minNotification,
  sendSearchingAlternativeNotification,
  activate2HGuarantee,
} from '@/lib/agents/notifications/smartNotificationAgent'

/**
 * Notification sweep cron job
 * Runs every 5 minutes to check for requests needing notifications
 * 
 * Timeline:
 * T+0 min:   Naročilo ustvarjeno → set deadline = now + 120min
 * T+90 min:  Ni odziva → urgent email partnerjem
 * T+110 min: Ni odziva → email stranki "iščemo alternativo"
 * T+120 min: Ni odziva → garancija aktivirana
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token || token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[notification-sweep] Starting notification sweep...')

  try {
    // Get all pending requests
    const { data: pendingRequests, error: fetchError } = await supabaseAdmin
      .from('povprasevanja')
      .select(
        `
        id,
        storitev,
        created_at,
        stranka_email,
        obrtnik_id,
        obrtniki:obrtnik_id(id, ime, email),
        status
      `
      )
      .eq('status', 'odprto')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('[notification-sweep] Error fetching pending requests:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch requests' },
        { status: 500 }
      )
    }

    if (!pendingRequests || pendingRequests.length === 0) {
      console.log('[notification-sweep] No pending requests found')
      return NextResponse.json({ processed: 0, notifications_sent: 0 })
    }

    console.log(
      `[notification-sweep] Found ${pendingRequests.length} pending requests`
    )

    let notificationsSent = 0
    const now = Date.now()

    for (const request of pendingRequests) {
      try {
        const createdAt = new Date(request.created_at).getTime()
        const elapsedMinutes = (now - createdAt) / (1000 * 60)

        console.log(
          `[notification-sweep] Processing request ${request.id}: ${elapsedMinutes.toFixed(1)} min elapsed`
        )

        // Check if we need to send any notifications
        if (elapsedMinutes >= 120) {
          // T+120 min: Activate 2H guarantee
          console.log(
            `[notification-sweep] Request ${request.id} reached 2H deadline`
          )
          await activate2HGuarantee(
            request.id,
            request.obrtnik_id || 'system',
            request.stranka_email,
            request.storitev
          )
          notificationsSent++
        } else if (elapsedMinutes >= 110) {
          // T+110 min: Email customer "searching for alternative"
          if (
            !await hasLoggedNotification(request.id, 'RESPONSE_DEADLINE_BREACH')
          ) {
            console.log(
              `[notification-sweep] Request ${request.id} reached 110min, sending search notification`
            )
            await sendSearchingAlternativeNotification(
              request.obrtnik_id || 'system',
              request.stranka_email,
              request.id,
              request.storitev
            )
            notificationsSent++
          }
        } else if (elapsedMinutes >= 90) {
          // T+90 min: Urgent email to matched partners
          if (!await hasLoggedNotification(request.id, 'RESPONSE_DEADLINE_90MIN')) {
            console.log(
              `[notification-sweep] Request ${request.id} reached 90min, sending urgent reminder`
            )
            const matchedPartners = await getMatchedPartners(request.id)
            for (const partner of matchedPartners) {
              await sendResponseDeadline90minNotification(
                partner.id,
                partner.email,
                request.id,
                request.storitev
              )
              notificationsSent++
            }
          }
        }
      } catch (error) {
        console.error(
          `[notification-sweep] Error processing request ${request.id}:`,
          error
        )
      }
    }

    console.log(
      `[notification-sweep] Completed. Sent ${notificationsSent} notifications`
    )
    return NextResponse.json({
      processed: pendingRequests.length,
      notifications_sent: notificationsSent,
    })
  } catch (error) {
    console.error('[notification-sweep] DETAILED ERROR:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

/**
 * Check if notification was already sent for this request
 */
async function hasLoggedNotification(
  requestId: string,
  notificationType: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('notification_logs')
    .select('id')
    .eq('request_id', requestId)
    .eq('type', notificationType)
    .limit(1)

  if (error) {
    console.error('[notification-sweep] Error checking notification log:', error)
    return false
  }

  return (data && data.length > 0) || false
}

/**
 * Get all matched partners for a request
 * In a real system, this would use the smart matching algorithm
 */
async function getMatchedPartners(
  requestId: string
): Promise<Array<{ id: string; email: string }>> {
  // For now, get partners who submitted offers for this request
  const { data, error } = await supabaseAdmin
    .from('ponudbe')
    .select('obrtnik_id, obrtniki:obrtnik_id(id, email)')
    .eq('povprasevanje_id', requestId)
    .eq('status', 'pending')
    .limit(10)

  if (error) {
    console.error('[notification-sweep] Error fetching matched partners:', error)
    return []
  }

  if (!data || data.length === 0) {
    return []
  }

  return data
    .map((offer: any) => ({
      id: offer.obrtnik_id,
      email: offer.obrtniki?.email || '',
    }))
    .filter((p) => p.email)
}
