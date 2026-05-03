import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { apiSuccess, badRequest, conflict, internalError } from '@/lib/api-response'
import { ensureReferralCode, processReferralCode } from '@/lib/referral/referralService'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { authLimiter } from '@/lib/rate-limit/limiters'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'
import { checkEmailRateLimit, escapeHtml, sanitizeText } from '@/lib/email/security'
import { writeEmailLog } from '@/lib/email/email-logs'
import { transitionOnboardingState } from '@/lib/onboarding/state-machine'

const registrationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(3, 'Company name must be at least 3 characters'),
  taxNumber: z.string().min(1, 'Tax number is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  workArea: z.string().min(1, 'Work area is required'),
  planSelected: z.enum(['start', 'pro']),
  referralCode: z.string().optional(),
})


async function postHandler(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = registrationSchema.parse(body)
    
    // Create Supabase client
    const supabase = await createClient()
    
    // Sign up the user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
      options: {
        emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/partner-dashboard`,
        data: {
          first_name: validatedData.firstName,
          last_name: validatedData.lastName,
          phone: validatedData.phone,
          company_name: validatedData.companyName,
          tax_number: validatedData.taxNumber,
          specialization: validatedData.specialization,
          work_area: validatedData.workArea,
          plan: validatedData.planSelected,
          user_type: 'craftworker',
          role: 'partner',
        },
      },
    })
    
    if (authError) {
      console.error('[v0] Supabase auth error:', authError)
      
      if (authError.message.includes('already registered')) {
        return conflict('This email is already registered.')
      }
      
      return internalError('Registration failed. Please try again.')
    }

    const userId = authData.user?.id
    if (!userId) {
      return internalError('Failed to create user account')
    }

    const welcomeRateLimit = await checkEmailRateLimit({
      request,
      action: 'signup_welcome',
      email: validatedData.email,
      userId,
    })

    if (!welcomeRateLimit.allowed) {
      await writeEmailLog({
        email: validatedData.email,
        type: 'welcome_email',
        status: 'rate_limited',
        userId,
        errorMessage: `Rate limited by ${welcomeRateLimit.reason}`,
        metadata: { endpoint: '/api/registracija-mojster', retryAfter: welcomeRateLimit.retryAfter },
      })
    }
    
    // Create obrtnik_profiles entry with initial plan
    const { error: profileError } = await supabase
      .from('obrtnik_profiles')
      .insert({
        id: userId,
        business_name: validatedData.companyName,
        description: 'Mojster brez opisa',
        subscription_tier: validatedData.planSelected === 'pro' ? 'pro' : 'start',
        is_verified: false,
        created_at: new Date().toISOString(),
      } as any)

    if (profileError) {
      console.error('[v0] Profile creation error:', profileError)
      const supabaseAdmin = createAdminClient()
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return internalError('Napaka pri ustvarjanju profila. Poskusite znova.')
    }

    try {
      await transitionOnboardingState(userId)
    } catch (onboardingError) {
      console.error('[v0] onboarding transition failed after signup:', onboardingError)
    }
    
    // Process referral code if provided
    if (validatedData.referralCode) {
      const referralProcessed = await processReferralCode(validatedData.referralCode, userId)
      if (referralProcessed) {
        console.log(`[v0] Referral processed for user ${userId}`)
      }
    }
    
    // Generate referral code for new user
    try {
      await ensureReferralCode(userId)
    } catch (err) {
      console.error('[v0] Failed to generate referral code:', err)
      // Don't fail registration if referral code generation fails
    }
    
    // Send welcome email using Resend
    const resend = getResendClient()
    if (resend && welcomeRateLimit.allowed) {
      try {
        await writeEmailLog({
          email: validatedData.email,
          type: 'welcome_email',
          status: 'pending',
          userId,
          metadata: { endpoint: '/api/registracija-mojster' },
        })

        const planName = validatedData.planSelected === 'pro' ? 'PRO (5% provizija)' : 'START (10% provizija)'
        const safeFirstName = escapeHtml(sanitizeText(validatedData.firstName, 120))
        const safeLastName = escapeHtml(sanitizeText(validatedData.lastName, 120))
        const safeCompanyName = escapeHtml(sanitizeText(validatedData.companyName, 160))
        const safeSpecialization = escapeHtml(sanitizeText(validatedData.specialization, 120))
        const safePlanName = escapeHtml(sanitizeText(planName, 120))

        const response = await resend.emails.send({
          from: getDefaultFrom(),
          to: resolveEmailRecipients(validatedData.email).to,
          subject: 'Dobrodošli na LiftGO - Potrdite vaš račun',
          html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Dobrodošli, ${safeFirstName}!</h2>
                <p>Hvala, da ste se pridružili LiftGO platformi kot obrtnik.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Vaši podatki:</h3>
                  <p style="margin: 5px 0;"><strong>Ime:</strong> ${safeFirstName} ${safeLastName}</p>
                  <p style="margin: 5px 0;"><strong>Podjetje:</strong> ${safeCompanyName}</p>
                  <p style="margin: 5px 0;"><strong>Specialnost:</strong> ${safeSpecialization}</p>
                  <p style="margin: 5px 0;"><strong>Paket:</strong> ${safePlanName}</p>
                </div>
                
                <p><strong>Naslednji koraki:</strong></p>
                <ol>
                  <li>Preverite email in potrdite svoj račun</li>
                  <li>Prijavite se v partner dashboard</li>
                  <li>Dopolnite svoj profil</li>
                  <li>Začnite prejemati povpraševanja</li>
                </ol>
                
                <p>Če potrebujete pomoč, nas kontaktirajte na <a href="mailto:info@liftgo.net">info@liftgo.net</a>.</p>
                
                <p>Lep pozdrav,<br/>Ekipa LiftGO</p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
                <p style="font-size: 12px; color: #6b7280;">
                  Liftgo d.o.o., Kuraltova ulica 12, 4208 Šenčur<br/>
                  <a href="https://www.liftgo.net">www.liftgo.net</a>
                </p>
              </div>
            `,
        })

        if (response.error) {
          await writeEmailLog({
            email: validatedData.email,
            type: 'welcome_email',
            status: 'failed',
            userId,
            errorMessage: response.error.message,
            metadata: { endpoint: '/api/registracija-mojster' },
          })
          console.error('[v0] Welcome email provider error:', response.error.message)
        } else {
          await writeEmailLog({
            email: validatedData.email,
            type: 'welcome_email',
            status: 'sent',
            userId,
            resendEmailId: response.data?.id,
            metadata: { endpoint: '/api/registracija-mojster' },
          })
        }
      } catch (emailError) {
        await writeEmailLog({
          email: validatedData.email,
          type: 'welcome_email',
          status: 'failed',
          userId,
          errorMessage: emailError instanceof Error ? emailError.message : 'Unknown email error',
          metadata: { endpoint: '/api/registracija-mojster' },
        })
        console.error('[v0] Welcome email error:', emailError)
        // Don't fail registration if email fails
      }
    }
    
    return apiSuccess(
      { userId },
      201
    )
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      return badRequest(errorMessage)
    }
    
    console.error('[v0] Registration error:', error)
    return internalError('Registration failed. Please try again.')
  }
}

export const POST = withRateLimit(authLimiter, postHandler)
