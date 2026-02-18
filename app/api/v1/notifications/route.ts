import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { NotificationService } from '@/lib/notifications/notification-service'
import { z } from 'zod'

const querySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
})

export async function GET(request: NextRequest) {
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

    // Parse and validate query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const validationResult = querySchema.safeParse(searchParams)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Neveljavni parametri', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { page, limit } = validationResult.data

    // Fetch notifications
    const result = await NotificationService.list(user.id, page, limit)

    return NextResponse.json({
      success: true,
      data: {
        notifications: result.notifications,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
        },
        unreadCount: result.unreadCount,
      },
    })
  } catch (error) {
    console.error('[notifications] GET error:', error)
    return NextResponse.json(
      { error: 'Napaka pri pridobivanju obvestil' },
      { status: 500 }
    )
  }
}
