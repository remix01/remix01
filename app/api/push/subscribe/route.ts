import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { savePushSubscription } from '@/lib/push-notifications'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return fail('Unauthorized', 401)
    }

    // Parse request body
    const { subscription } = await request.json()

    if (!subscription || !subscription.endpoint) {
      return fail('Invalid subscription', 400)
    }

    // Detect device info from User-Agent
    const userAgent = request.headers.get('user-agent') || ''
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent)
    const deviceInfo = isMobile ? 'Mobile' : 'Desktop'

    // Save push subscription
    const result = await savePushSubscription({
      userId: user.id,
      subscription,
      deviceInfo
    })

    if (!result.success) {
      return fail(result.error, 500)
    }

    return ok({ success: true })
  } catch (error) {
    console.error('[v0] Error in push subscribe:', error)
    return fail('Internal server error', 500)
  }
}
