import { createClient } from '@/lib/supabase/server'

// Note: web-push import is kept in API routes only to avoid bundling Node.js modules
// This file only handles database operations

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
 * This function makes an internal API call to avoid importing web-push in client bundles
 */
export async function sendPushToUser(params: SendPushToUserParams): Promise<{ sent: number; failed: number }> {
  try {
    // Make internal API call to push/send endpoint
    const response = await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: params.userId,
        title: params.title,
        message: params.message,
        link: params.link,
        icon: params.icon
      })
    })

    if (!response.ok) {
      console.error('[v0] Push API call failed:', response.statusText)
      return { sent: 0, failed: 0 }
    }

    const result = await response.json()
    return { sent: result.sent || 0, failed: result.failed || 0 }
  } catch (error) {
    console.error('[v0] Error calling push API:', error)
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

    // Send push to each obrtnik via API
    let totalSent = 0
    for (const oc of obrtnikiCategories) {
      const result = await sendPushToUser({
        userId: oc.obrtnik_id,
        title: params.title,
        message: params.message,
        link: params.link
      })
      totalSent += result.sent
    }

    return { sent: totalSent }
  } catch (error) {
    console.error('[v0] Error in sendPushToObrtnikiByCategory:', error)
    return { sent: 0 }
  }
}
