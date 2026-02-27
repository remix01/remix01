import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import webpush from 'web-push'

// Lazy VAPID configuration function - returns false if not configured
function getWebPush() {
  if (!env.VAPID_SUBJECT || 
      !env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 
      !env.VAPID_PRIVATE_KEY) {
    return null
  }
  
  webpush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  )
  return webpush
}

export async function POST(request: NextRequest) {
  // Configure VAPID on first request (not at module load time)
  const wp = getWebPush()
  
  if (!wp) {
    console.warn('[v0] Push notifications not configured - missing VAPID environment variables')
    return NextResponse.json({ sent: 0, failed: 0 })
  }

  try {
    // Parse request body
    const { userId, title, message, link, icon } = await request.json()

    if (!userId || !title || !message) {
      return NextResponse.json({ error: 'userId, title, and message required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Fetch push subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)

    if (error || !subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ sent: 0, failed: 0 })
    }

    // Prepare push notification payload
    const payload = JSON.stringify({
      title,
      body: message,
      icon: icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { 
        link: link || '/',
        timestamp: Date.now()
      },
      actions: [
        { action: 'open', title: 'Odpri' },
        { action: 'close', title: 'Zapri' }
      ]
    })

    let sent = 0
    let failed = 0

    // Send push to each subscription
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh!,
            auth: subscription.auth!
          }
        }

        await wp.sendNotification(pushSubscription, payload)
        sent++
      } catch (error: any) {
        console.error('[v0] Error sending push to subscription:', error)
        
        // If subscription expired (410 Gone), delete it from database
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint)
        }
        
        failed++
      }
    }

    return NextResponse.json({ sent, failed })
  } catch (error) {
    console.error('[v0] Error in push send:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
