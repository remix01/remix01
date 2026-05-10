import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth/require'
import { notificationService, handleServiceError } from '@/lib/services'
import { notificationsListQuerySchema } from '@/lib/api/schemas/v1'

export async function GET(request: NextRequest) {
  try {
    let user
    try {
      user = await requireUser()
    } catch {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse and validate query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const validationResult = notificationsListQuerySchema.safeParse(searchParams)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Neveljavni parametri', details: validationResult.error.errors },
        { status: 400 }
      )
    }

    const { page, limit } = validationResult.data

    // Delegate to service layer
    const result = await notificationService.listNotifications(user.id, { page, limit })

    return NextResponse.json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[notifications] GET error:', error)
    return handleServiceError(error)
  }
}
