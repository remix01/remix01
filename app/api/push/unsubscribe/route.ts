import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
    const { endpoint } = await request.json()

    if (!endpoint) {
      return fail('Endpoint required', 400)
    }

    // Delete push subscription
    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('user_id', user.id)

    if (error) {
      console.error('[v0] Error deleting push subscription:', error)
      return fail(error.message, 500)
    }

    return ok({ success: true })
  } catch (error) {
    console.error('[v0] Error in push unsubscribe:', error)
    return fail('Internal server error', 500)
  }
}
