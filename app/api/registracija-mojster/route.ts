import { NextRequest } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { apiSuccess, badRequest, conflict, internalError } from '@/lib/api-response'
import { ensureReferralCode, processReferralCode } from '@/lib/referral/referralService'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { authLimiter } from '@/lib/rate-limit/limiters'
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

    // Create obrtnik_profiles entry with initial plan
    const { error: profileError } = await supabase
      .from('obrtnik_profiles')
      .insert({
        id: userId,
        business_name: validatedData.companyName,
        subscription_tier: validatedData.planSelected === 'pro' ? 'pro' : 'start',
        is_verified: false,
        created_at: new Date().toISOString(),
      } as any)

    if (profileError) {
      console.error('[v0] Profile creation error:', profileError)
      // Don't fail completely if profile creation fails
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
