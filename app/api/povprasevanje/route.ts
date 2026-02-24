import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { apiSuccess, badRequest, internalError } from '@/lib/api-response'

const inquirySchema = z.object({
  storitev: z.string().min(1, 'Storitev je obvezna'),
  lokacija: z.string().min(1, 'Lokacija je obvezna'),
  email: z.string().email('Neveljaven e-poštni naslov'),
  telefon: z.string().regex(/^(\+386|0)[0-9]{8,9}$/, 'Neveljavna telefonska številka'),
  zeljeniDatum: z.string().optional(),
  opis: z.string().min(10, 'Opis mora vsebovati vsaj 10 znakov').max(500),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = inquirySchema.parse(body)
    
    // Save to Supabase
    const supabase = await createClient()
    
    const { data: inquiry, error: dbError } = await supabase
      .from('inquiries')
      .insert({
        service: validatedData.storitev,
        location: validatedData.lokacija,
        email: validatedData.email,
        phone: validatedData.telefon,
        preferred_date: validatedData.zeljeniDatum || null,
        description: validatedData.opis,
        status: 'pending',
        created_at: new Date().toISOString(),
      })
      .select()
      .single()
    
    if (dbError) {
      console.error('[v0] Database error:', dbError)
      return internalError('Failed to save inquiry.')
    }
    
    // Send confirmation email to customer using Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: process.env.NEXT_PUBLIC_FROM_EMAIL || 'noreply@liftgo.net',
            to: validatedData.email,
            subject: 'Povpraševanje prejeto - LiftGO',
            html: `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Povpraševanje uspešno prejeto!</h2>
                <p>Spoštovani,</p>
                <p>Hvala za zaupanje. Vaše povpraševanje je bilo uspešno poslano našim obrtinkom.</p>
                <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <p style="margin: 5px 0;"><strong>Storitev:</strong> ${validatedData.storitev}</p>
                  <p style="margin: 5px 0;"><strong>Lokacija:</strong> ${validatedData.lokacija}</p>
                  ${validatedData.zeljeniDatum ? `<p style="margin: 5px 0;"><strong>Željeni datum:</strong> ${validatedData.zeljeniDatum}</p>` : ''}
                  <p style="margin: 5px 0;"><strong>Opis:</strong> ${validatedData.opis}</p>
                </div>
                <p><strong>Kaj sledi?</strong></p>
                <ul>
                  <li>V roku 2 ur boste prejeli ponudbe ustreznih obrtnikov</li>
                  <li>Izberete najprimernejšo ponudbo</li>
                  <li>Obrtnik vas kontaktira za dogovor</li>
                </ul>
                <p>Lep pozdrav,<br/>Ekipa LiftGO</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
                <p style="font-size: 12px; color: #6b7280;">
                  To je avtomatsko sporočilo. Ne odgovarjajte na ta email.
                </p>
              </div>
            `,
          }),
        })
        
        if (!resendResponse.ok) {
          console.error('[v0] Resend email error:', await resendResponse.text())
        }
      } catch (emailError) {
        console.error('[v0] Email sending failed:', emailError)
        // Ne failaj celotnega requesta če email ne gre skozi
      }
    }
    
    return apiSuccess(
      { inquiryId: inquiry?.id },
      201
    )
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      return badRequest(errorMessage)
    }
    
    console.error('[v0] Inquiry submission error:', error)
    return internalError('Failed to submit inquiry.')
  }
}
