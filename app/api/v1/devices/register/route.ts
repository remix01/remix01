import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TokenService } from '@/lib/push/token-service'
import { z } from 'zod'

const registerSchema = z.object({
  token: z.string().min(1, 'Token je obvezen'),
  platform: z.enum(['ios', 'android', 'web'], {
    errorMap: () => ({ message: 'Platforma mora biti ios, android ali web' }),
  }),
  appVersion: z.string().optional(),
  deviceName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'Nepooblaščen dostop' },
        { status: 401 }
      )
    }

    // Validate request body
    const body = await request.json()
    const validation = registerSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Neveljavni podatki',
          details: validation.error.errors,
        },
        { status: 400 }
      )
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

    return NextResponse.json({
      success: true,
      data: deviceToken,
    })
  } catch (error) {
    console.error('[Device Register] Error:', error)
    return NextResponse.json(
      { error: 'Napaka pri registraciji naprave' },
      { status: 500 }
    )
  }
}
