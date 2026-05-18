import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sender'
import { apiSuccess, badRequest, unauthorized, internalError } from '@/lib/api-response'

const referralSchema = z.object({
  referrerId: z.string().uuid('Invalid referrer ID'),
  newCraftworkerId: z.string().uuid('Invalid craftworker ID')
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return unauthorized()
    }

    const body = await request.json()
    const { referrerId, newCraftworkerId } = referralSchema.parse(body)

    // Fetch referrer profile from canonical obrtnik_profiles
    const { data: referrerData, error: referrerError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, referral_code, loyalty_points')
      .eq('id', referrerId)
      .single()

    if (referrerError || !referrerData) {
      throw new Error('Referrer not found')
    }

    // Fetch new craftworker profile from canonical tables
    const { data: newProfile, error: newProfileError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id, referred_by, created_at')
      .eq('id', newCraftworkerId)
      .single()

    if (newProfileError || !newProfile) {
      throw new Error('New craftworker profile not found')
    }

    // Check if craftworker was registered within last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    if (new Date(newProfile.created_at) < thirtyDaysAgo) {
      throw new Error('Craftworker must be registered within the last 30 days')
    }

    // Check if already referred
    if (newProfile.referred_by) {
      throw new Error('This craftworker has already been referred')
    }

    // Update new craftworker with referral code (canonical obrtnik_profiles)
    const { error: updateError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update({ referred_by: referrerData.referral_code })
      .eq('id', newProfile.id)

    if (updateError) throw new Error(updateError.message)

    // Add 100 loyalty points to referrer
    const { data: updatedReferrer, error: referrerUpdateError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .update({
        loyalty_points: (referrerData.loyalty_points || 0) + 100
      })
      .eq('id', referrerData.id)
      .select('loyalty_points')
      .single()

    if (referrerUpdateError) throw new Error(referrerUpdateError.message)

    // Fetch referrer contact info from profiles
    const { data: referrerProfile } = await supabaseAdmin
      .from('profiles')
      .select('email, full_name')
      .eq('id', referrerId)
      .maybeSingle()

    // Send email notification to referrer
    try {
      if (referrerProfile?.email) {
        await sendEmail(referrerProfile.email, {
          subject: 'Hvala za priporočilo!',
          html: `
            <h2>Hvala za priporočilo!</h2>
            <p>Pozdravljeni ${referrerProfile.full_name || ''},</p>
            <p>Prejeli ste <strong>100 zvestobnih točk</strong> za uspešno priporočilo novega mojstra na LiftGO platformo.</p>
            <p>Vaše zvestobne točke: <strong>${(updatedReferrer?.loyalty_points || 0)}</strong></p>
            <p>To pomeni dodatni popust na vašo provizijo! 100 točk = 0.5% popust.</p>
            <p>Hvala, da ste del LiftGO skupnosti!</p>
            <p>Ekipa LiftGO</p>
          `
        })
      }
    } catch (emailError) {
      console.error('[referral-submit] Email error:', emailError)
      // Don't fail the request if email fails
    }

    return apiSuccess(
      { loyaltyPoints: updatedReferrer?.loyalty_points || 0 }
    )

  } catch (error) {
    console.error('[referral-submit] Error:', error)

    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ')
      return badRequest(errorMessage)
    }

    if (error instanceof Error) {
      return badRequest(error.message)
    }

    return internalError('Failed to process referral.')
  }
}
