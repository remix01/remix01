import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/notifications/notification-service'
import { ok, fail } from '@/lib/http/response'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return fail('Unauthorized', 401)
    }

    const { id } = await params

    // Mark notification as read
    const success = await NotificationService.markRead(id, user.id)

    if (!success) {
      return fail('Obvestilo ni bilo najdeno ali ni vaše', 404)
    }

    return ok({
      success: true,
      message: 'Obvestilo označeno kot prebrano',
    })
  } catch (error) {
    console.error('[notifications/read] PATCH error:', error)
    return fail('Napaka pri označevanju obvestila', 500)
  }
}
