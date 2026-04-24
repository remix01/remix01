import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TokenService } from '@/lib/push/token-service'
import { deviceRegisterBodySchema } from '@/lib/api/schemas/v1'
import { ok, fail } from '@/lib/http/response'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return fail('Nepooblaščen dostop', 401)
    }

    // Validate request body
    const body = await request.json()
    const validation = deviceRegisterBodySchema.safeParse(body)

    if (!validation.success) {
      return fail('Neveljavni podatki', 400, { details: validation.error.errors })
    }

    const { token, platform, appVersion, deviceName } = validation.data

    // Register device token
    const deviceToken = await TokenService.register(
      user.id,
      token,
      platform,
      appVersion,
      deviceName
    )

    return ok({
      success: true,
      data: deviceToken,
    })
  } catch (error) {
    console.error('[Device Register] Error:', error)
    return fail('Napaka pri registraciji naprave', 500)
  }
}
