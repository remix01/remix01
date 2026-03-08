import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { apiSuccess, badRequest, conflict, internalError } from '@/lib/api-response'

const registrationSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(1, 'Phone number is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  companyName: z.string().min(1, 'Company name is required'),
  taxNumber: z.string().min(1, 'Tax number is required'),
  specialization: z.string().min(1, 'Specialization is required'),
  workArea: z.string().min(1, 'Work area is required'),
  planSelected: z.enum(['start', 'pro']),
})

export async function POST(request: NextRequest) {
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
    
    // Send welcome email using Resend
    if (env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@liftgo.net',
            to: validatedData.email,
            subject: 'Dobrodošli na LiftGO - Potrdite vaš račun',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Dobrodošli, ${validatedData.firstName}!</h2>
                <p>Hvala, da ste se pridružili LiftGO platformi kot obrtnik.</p>
                
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0;">Vaši podatki:</h3>
                  <p style="margin: 5px 0;"><strong>Ime:</strong> ${validatedData.firstName} ${validatedData.lastName}</p>
                  <p style="margin: 5px 0;"><strong>Podjetje:</strong> ${validatedData.companyName}</p>
                  <p style="margin: 5px 0;"><strong>Specialnost:</strong> ${validatedData.specialization}</p>
                  <p style="margin: 5px 0;"><strong>Paket:</strong> ${validatedData.planSelected === 'pro' ? 'PRO (5% provizija)' : 'START (10% provizija)'}</p>
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
          }),
        })
      } catch (emailError) {
        console.error('[v0] Welcome email error:', emailError)
        // Don't fail registration if email fails
      }
    }
    
    return apiSuccess(
      { userId: authData.user?.id },
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
