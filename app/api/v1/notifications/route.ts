import { NextRequest } from 'next/server'
import { requireUser } from '@/lib/auth/require'
import { notificationService, handleServiceError } from '@/lib/services'
import { notificationsListQuerySchema } from '@/lib/api/schemas/v1'
import { ok, fail } from '@/lib/http/response'

export async function GET(request: NextRequest) {
  try {
    let user
    try {
      user = await requireUser()
    } catch {
      return fail('Unauthorized', 401)
    }

    // Parse and validate query params
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const validationResult = notificationsListQuerySchema.safeParse(searchParams)

    if (!validationResult.success) {
      return fail('Neveljavni parametri', 400, { details: validationResult.error.errors })
    }

    const { page, limit } = validationResult.data

    // Delegate to service layer
    const result = await notificationService.listNotifications(user.id, { page, limit })

    return ok({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error('[notifications] GET error:', error)
    return handleServiceError(error)
  }
}
