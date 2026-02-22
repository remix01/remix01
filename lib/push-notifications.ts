import webpush from 'web-push'
import { createClient } from '@/lib/supabase/server'

// Configure VAPID details for web push
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

interface PushSubscriptionKeys {
  p256dh: string
  auth: string
}

interface SavePushSubscriptionParams {
  userId: string
  subscription: {
    endpoint: string
    keys: PushSubscriptionKeys
  }
  deviceInfo?: string
}

/**
 * Save push subscription for a user
 */
export async function savePushSubscription(params: SavePushSubscriptionParams): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: params.userId,
        endpoint: params.subscription.endpoint,
        p256dh: params.subscription.keys.p256dh,
        auth: params.subscription.keys.auth,
        device_info: params.deviceInfo || null,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'endpoint' 
      })

    if (error) {
      console.error('[v0] Error saving push subscription:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('[v0] Error in savePushSubscription:', error)
    return { success: false, error: 'Failed to save push subscription' }
  }
}

interface SendPushToUserParams {
  userId: string
  title: string
  message: string
  link?: string
  icon?: string
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(params: SendPushToUserParams): Promise<{ sent: number; failed: number }> {
  let sent = 0
  let failed = 0

  try {
    const supabase = await createClient()

    // Fetch all push subscriptions for the user
    const { data: subscriptions, error } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', params.userId)

    if (error || !subscriptions || subscriptions.length === 0) {
      return { sent: 0, failed: 0 }
    }

    // Prepare push notification payload
    const payload = JSON.stringify({
      title: params.title,
      body: params.message,
      icon: params.icon || '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { 
        link: params.link || '/',
        timestamp: Date.now()
      },
      actions: [
        { action: 'open', title: 'Odpri' },
        { action: 'close', title: 'Zapri' }
      ]
    })

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

        await webpush.sendNotification(pushSubscription, payload)
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

    return { sent, failed }
  } catch (error) {
    console.error('[v0] Error in sendPushToUser:', error)
    return { sent, failed }
  }
}

interface SendPushToObrtnikiParams {
  categoryId: string
  title: string
  message: string
  link: string
}

/**
 * Send push notification to all obrtniki in a category
 */
export async function sendPushToObrtnikiByCategory(params: SendPushToObrtnikiParams): Promise<{ sent: number }> {
  try {
    const supabase = await createClient()

    // Fetch obrtnik IDs from the category
    const { data: obrtnikiCategories, error: categoriesError } = await supabase
      .from('obrtnik_categories')
      .select('obrtnik_id')
      .eq('category_id', params.categoryId)

    if (categoriesError || !obrtnikiCategories || obrtnikiCategories.length === 0) {
      return { sent: 0 }
    }

    const obrtnikiIds = obrtnikiCategories.map(oc => oc.obrtnik_id)

    // Fetch push subscriptions for these obrtniki
    const { data: subscriptions, error: subscriptionsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', obrtnikiIds)

    if (subscriptionsError || !subscriptions || subscriptions.length === 0) {
      return { sent: 0 }
    }

    // Prepare push notification payload
    const payload = JSON.stringify({
      title: params.title,
      body: params.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: { 
        link: params.link,
        timestamp: Date.now()
      },
      actions: [
        { action: 'open', title: 'Poglej' },
        { action: 'close', title: 'Zapri' }
      ]
    })

    let sent = 0

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

        await webpush.sendNotification(pushSubscription, payload)
        sent++
      } catch (error: any) {
        console.error('[v0] Error sending push to obrtnik:', error)
        
        // If subscription expired (410 Gone), delete it from database
        if (error.statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('endpoint', subscription.endpoint)
        }
      }
    }

    return { sent }
  } catch (error) {
    console.error('[v0] Error in sendPushToObrtnikiByCategory:', error)
    return { sent: 0 }
  }
}
