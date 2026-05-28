import { createClient } from '@/lib/supabase/server'
import { sendWebPushToUser } from '@/lib/push/web-subscription-service'

// Note: web-push import is kept in web-subscription-service only to avoid bundling Node.js modules
// This file handles database operations and server-side push dispatch

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

    const { error } = await (supabase as any)
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
 * Send push notification to a specific user.
 * Uses sendWebPushToUser directly — no server-side self-call via fetch.
 */
export async function sendPushToUser(params: SendPushToUserParams): Promise<{ sent: number; failed: number }> {
  try {
    return await sendWebPushToUser({
      userId: params.userId,
      title: params.title,
      body: params.message,
      data: params.link ? { url: params.link } : undefined,
    })
  } catch (error) {
    console.error('[v0] Error sending push notification:', error)
    return { sent: 0, failed: 0 }
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
 * This function fetches obrtniki IDs then calls the internal API
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

    // Send push to each obrtnik directly via web-push (server-safe, no self-call)
    let totalSent = 0
    for (const oc of obrtnikiCategories) {
      const result = await sendWebPushToUser({
        userId: oc.obrtnik_id,
        title: params.title,
        body: params.message,
        data: { link: params.link },
      }).catch(() => ({ sent: 0, failed: 0 }))
      totalSent += result.sent
    }

    return { sent: totalSent }
  } catch (error) {
    console.error('[v0] Error in sendPushToObrtnikiByCategory:', error)
    return { sent: 0 }
  }
}
