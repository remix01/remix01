import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { authLimiter } from '@/lib/rate-limit/limiters'

const registrationSchema = z.object({
  fullName: z.string().min(1, 'Ime in priimek je obvezen.'),
  email: z.string().email('Email ni veljaven.'),
  password: z.string().min(8, 'Geslo mora biti najmanj 8 znakov.'),
  phone: z.string().optional(),
  location_city: z.string().min(1, 'Mesto je obvezno.'),
  role: z.enum(['narocnik', 'obrtnik']),
})

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = registrationSchema.parse(body)

    const supabaseAdmin = createAdminClient()

    const { data: authData, error: signUpError } = await supabaseAdmin.auth.signUp({
      email: validated.email,
      password: validated.password,
    })

    if (signUpError) {
      if (signUpError.message.toLowerCase().includes('already registered')) {
        return NextResponse.json({ error: 'Email že obstaja.' }, { status: 409 })
      }
      return NextResponse.json({ error: signUpError.message || 'Napaka pri registraciji.' }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Napaka pri registraciji.' }, { status: 500 })
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: userId,
      role: validated.role,
      full_name: validated.fullName,
      phone: validated.phone || null,
      location_city: validated.location_city,
      email: validated.email,
    })

    if (profileError) {
      return NextResponse.json({ error: 'Napaka pri ustvarjanju profila.' }, { status: 500 })
    }

    if (validated.role === 'obrtnik') {
      const { error: obrtnikError } = await supabaseAdmin.from('obrtnik_profiles').insert({
        id: userId,
        business_name: validated.fullName,
        description: 'Mojster brez opisa',
        is_verified: false,
        status: 'pending',
      })

      if (obrtnikError) {
        return NextResponse.json({ error: 'Napaka pri ustvarjanju obrtnikovega profila.' }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    return NextResponse.json({ error: 'Napaka pri registraciji. Poskusite znova.' }, { status: 500 })
  }
}

export const POST = withRateLimit(authLimiter, postHandler)
