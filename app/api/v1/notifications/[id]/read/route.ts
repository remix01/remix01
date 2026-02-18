import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/notifications/notification-service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params

    // Mark notification as read
    const success = await NotificationService.markRead(id, user.id)

    if (!success) {
      return NextResponse.json(
        { error: 'Obvestilo ni bilo najdeno ali ni vaše' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Obvestilo označeno kot prebrano',
    })
  } catch (error) {
    console.error('[notifications/read] PATCH error:', error)
    return NextResponse.json(
      { error: 'Napaka pri označevanju obvestila' },
      { status: 500 }
    )
  }
}
