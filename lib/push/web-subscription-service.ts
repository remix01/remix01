import webpush from 'web-push'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { env } from '@/lib/env'

interface WebPushResult {
  sent: number
  failed: number
}

function isWebPushConfigured() {
  return Boolean(env.VAPID_SUBJECT && env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY)
}

function configureWebPush() {
  webpush.setVapidDetails(env.VAPID_SUBJECT!, env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, env.VAPID_PRIVATE_KEY!)
}

export async function sendWebPushToUser(params: {
  userId: string
  title: string
  body: string
  data?: Record<string, unknown>
}): Promise<WebPushResult> {
  if (!isWebPushConfigured()) {
    return { sent: 0, failed: 0 }
  }

  configureWebPush()

  const { data: subscriptions, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', params.userId)

  if (error || !subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0 }
  }

  const payload = JSON.stringify({
    title: params.title,
    body: params.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: params.data ?? {},
  })

  let sent = 0
  let failed = 0

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        payload,
      )
      sent += 1
    } catch (err: any) {
      failed += 1
      if (err?.statusCode === 410) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
      }
    }
  }

  return { sent, failed }
}
