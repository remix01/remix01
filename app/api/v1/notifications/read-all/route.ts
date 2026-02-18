import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/notifications/notification-service'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Mark all notifications as read
    const success = await NotificationService.markAllRead(user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Napaka pri označevanju obvestil' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Vsa obvestila označena kot prebrana',
    })
  } catch (error) {
    console.error('[notifications/read-all] PATCH error:', error)
    return NextResponse.json(
      { error: 'Napaka pri označevanju obvestil' },
      { status: 500 }
    )
  }
}
