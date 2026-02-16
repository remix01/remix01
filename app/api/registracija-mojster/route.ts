import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const registrationSchema = z.object({
  firstName: z.string().min(1, 'Ime je obvezno'),
  lastName: z.string().min(1, 'Priimek je obvezno'),
  email: z.string().email('Neveljaven e-poštni naslov'),
  phone: z.string().min(1, 'Telefonska številka je obvezna'),
  password: z.string().min(8, 'Geslo mora imeti vsaj 8 znakov'),
  companyName: z.string().min(1, 'Podjetje je obvezno'),
  taxNumber: z.string().min(1, 'Davčna številka je obvezna'),
  specialization: z.string().min(1, 'Specialnost je obvezna'),
  workArea: z.string().min(1, 'Območje dela je obvezno'),
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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/partner-dashboard`,
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
        return NextResponse.json(
          { error: 'Ta e-poštni naslov je že registriran' },
          { status: 400 }
        )
      }
      
      return NextResponse.json(
        { error: 'Napaka pri registraciji. Poskusite znova.' },
        { status: 500 }
      )
    }
    
    // Send welcome email using Resend
    if (process.env.RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@liftgo.net',
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
    
    return NextResponse.json(
      {
        success: true,
        message: 'Registracija uspešna. Preverite email za potrditev.',
        userId: authData.user?.id,
      },
      { status: 201 }
    )
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Neveljavni podatki', details: error.errors },
        { status: 400 }
      )
    }
    
    console.error('[v0] Registration error:', error)
    return NextResponse.json(
      { error: 'Napaka pri registraciji. Poskusite znova.' },
      { status: 500 }
    )
  }
}
