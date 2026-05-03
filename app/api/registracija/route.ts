import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { authLimiter } from '@/lib/rate-limit/limiters'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'
import { checkEmailRateLimit, escapeHtml, sanitizeText } from '@/lib/email/security'
import { writeEmailLog } from '@/lib/email/email-logs'

const registrationSchema = z.object({
  fullName: z.string().min(1, 'Ime in priimek je obvezen.'),
  email: z.string().email('Email ni veljaven.'),
  password: z.string().min(8, 'Geslo mora biti najmanj 8 znakov.'),
  phone: z.string().optional(),
  location_city: z.string().min(1, 'Mesto je obvezno.'),
  role: z.enum(['narocnik', 'obrtnik']),
  tosAccepted: z.literal(true),
  privacyAccepted: z.literal(true),
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
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Napaka pri ustvarjanju profila. Poskusite znova.' }, { status: 500 })
    }

    if (validated.role === 'obrtnik') {
      const { error: obrtnikError } = await supabaseAdmin.from('obrtnik_profiles').insert({
        id: userId,
        business_name: validated.fullName,
        is_verified: false,
        status: 'pending',
      })

      if (obrtnikError) {
        await supabaseAdmin.from('profiles').delete().eq('id', userId)
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return NextResponse.json({ error: 'Napaka pri ustvarjanju obrtnikovega profila. Poskusite znova.' }, { status: 500 })
      }
    }

    const welcomeRateLimit = await checkEmailRateLimit({
      request,
      action: 'signup_welcome',
      email: validated.email,
      userId,
    })

    if (!welcomeRateLimit.allowed) {
      await writeEmailLog({
        email: validated.email,
        type: 'welcome_email',
        status: 'rate_limited',
        userId,
        errorMessage: `Rate limited by ${welcomeRateLimit.reason}`,
        metadata: { endpoint: '/api/registracija', retryAfter: welcomeRateLimit.retryAfter },
      })
    }

    const resend = getResendClient()
    if (resend && welcomeRateLimit.allowed) {
      try {
        await writeEmailLog({
          email: validated.email,
          type: 'welcome_email',
          status: 'pending',
          userId,
          metadata: { endpoint: '/api/registracija', role: validated.role },
        })

        const safeFullName = escapeHtml(sanitizeText(validated.fullName, 160))
        const firstName = validated.fullName.trim().split(/\s+/)[0] || 'uporabnik'
        const safeFirstName = escapeHtml(sanitizeText(firstName, 120))
        const subject =
          validated.role === 'obrtnik'
            ? 'Dobrodošli na LiftGO - Potrdite vaš račun'
            : 'Dobrodošli na LiftGO'
        const html =
          validated.role === 'obrtnik'
            ? `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Dobrodošli, ${safeFirstName}!</h2>
                <p>Hvala, da ste se pridružili LiftGO platformi kot obrtnik.</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Vaši podatki:</h3>
                  <p style="margin: 5px 0;"><strong>Ime / podjetje:</strong> ${safeFullName}</p>
                </div>
                <p><strong>Naslednji koraki:</strong></p>
                <ol>
                  <li>Preverite email in potrdite svoj račun</li>
                  <li>Prijavite se v partner dashboard</li>
                  <li>Dopolnite svoj profil</li>
                  <li>Začnite prejemati povpraševanja</li>
                </ol>
                <p>Lep pozdrav,<br/>Ekipa LiftGO</p>
              </div>
            `
            : `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Dobrodošli, ${safeFirstName}!</h2>
                <p>Hvala za registracijo na LiftGO.</p>
                <p>Vaš račun je pripravljen — zdaj lahko oddate povpraševanje in hitro najdete pravega mojstra.</p>
                <p>Lep pozdrav,<br/>Ekipa LiftGO</p>
              </div>
            `

        const response = await resend.emails.send({
          from: getDefaultFrom(),
          to: resolveEmailRecipients(validated.email).to,
          subject,
          html,
        })

        if (response.error) {
          await writeEmailLog({
            email: validated.email,
            type: 'welcome_email',
            status: 'failed',
            userId,
            errorMessage: response.error.message,
            metadata: { endpoint: '/api/registracija', role: validated.role },
          })
        } else {
          await writeEmailLog({
            email: validated.email,
            type: 'welcome_email',
            status: 'sent',
            userId,
            resendEmailId: response.data?.id,
            metadata: { endpoint: '/api/registracija', role: validated.role },
          })
        }
      } catch (emailError) {
        await writeEmailLog({
          email: validated.email,
          type: 'welcome_email',
          status: 'failed',
          userId,
          errorMessage: emailError instanceof Error ? emailError.message : 'Unknown email error',
          metadata: { endpoint: '/api/registracija', role: validated.role },
        })
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof z.ZodError) {
      const requiresConsent = error.errors.some(
        e => e.path.includes('tosAccepted') || e.path.includes('privacyAccepted')
      )
      if (requiresConsent) {
        return NextResponse.json(
          { error: 'Sprejeti morate pogoje uporabe in politiko zasebnosti.' },
          { status: 400 }
        )
      }
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      return NextResponse.json({ error: errorMessage }, { status: 400 })
    }
    return NextResponse.json({ error: 'Napaka pri registraciji. Poskusite znova.' }, { status: 500 })
  }
}

export const POST = withRateLimit(authLimiter, postHandler)
