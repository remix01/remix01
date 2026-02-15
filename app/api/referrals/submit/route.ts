import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/sender'

const referralSchema = z.object({
  referrerId: z.string(),
  newCraftworkerId: z.string()
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { referrerId, newCraftworkerId } = referralSchema.parse(body)

    const result = await prisma.$transaction(async (tx) => {
      // Fetch referrer profile
      const referrerProfile = await tx.craftworkerProfile.findUnique({
        where: { userId: referrerId },
        include: { user: true }
      })

      if (!referrerProfile) {
        throw new Error('Referrer not found')
      }

      // Fetch new craftworker
      const newCraftworker = await tx.user.findUnique({
        where: { id: newCraftworkerId },
        include: { craftworkerProfile: true }
      })

      if (!newCraftworker || !newCraftworker.craftworkerProfile) {
        throw new Error('New craftworker not found')
      }

      // Check if craftworker was registered within last 30 days
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      if (newCraftworker.createdAt < thirtyDaysAgo) {
        throw new Error('Craftworker must be registered within the last 30 days')
      }

      // Check if already referred
      if (newCraftworker.craftworkerProfile.referredBy) {
        throw new Error('This craftworker has already been referred')
      }

      // Update new craftworker with referral code
      await tx.craftworkerProfile.update({
        where: { id: newCraftworker.craftworkerProfile.id },
        data: {
          referredBy: referrerProfile.referralCode
        }
      })

      // Add 100 loyalty points to referrer (100 points = 0.5% discount)
      const updatedReferrer = await tx.craftworkerProfile.update({
        where: { id: referrerProfile.id },
        data: {
          loyaltyPoints: {
            increment: 100
          }
        }
      })

      return {
        referrer: updatedReferrer,
        referrerUser: referrerProfile.user
      }
    })

    // Send email notification to referrer
    try {
      await sendEmail({
        to: result.referrerUser.email,
        subject: '🎉 Hvala za priporočilo!',
        html: `
          <h2>Hvala za priporočilo!</h2>
          <p>Pozdravljeni ${result.referrerUser.name},</p>
          <p>Prejeli ste <strong>100 zvestobnih točk</strong> za uspešno priporočilo novega mojstra na LiftGO platformo.</p>
          <p>Vaše zvestobne točke: <strong>${result.referrer.loyaltyPoints}</strong></p>
          <p>To pomeni dodatni popust na vašo provizijo! 100 točk = 0.5% popust.</p>
          <p>Hvala, da ste del LiftGO skupnosti!</p>
          <p>Ekipa LiftGO</p>
        `
      })
    } catch (emailError) {
      console.error('[referral-submit] Email error:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      loyaltyPoints: result.referrer.loyaltyPoints,
      message: 'Referral bonus awarded successfully'
    })

  } catch (error) {
    console.error('[referral-submit] Error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request data', details: error.errors }, { status: 400 })
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
