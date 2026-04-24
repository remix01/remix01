import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/notifications/notification-service'
import { ok, fail } from '@/lib/http/response'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return fail('Unauthorized', 401)
    }

    // Mark all notifications as read
    const success = await NotificationService.markAllRead(user.id)

    if (!success) {
      return fail('Napaka pri označevanju obvestil', 500)
    }

    return ok({
      success: true,
      message: 'Vsa obvestila označena kot prebrana',
    })
  } catch (error) {
    console.error('[notifications/read-all] PATCH error:', error)
    return fail('Napaka pri označevanju obvestil', 500)
  }
}
