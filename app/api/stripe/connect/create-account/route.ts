import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const requestSchema = z.object({
  email: z.string().email(),
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify user is a craftworker
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { craftworkerProfile: true }
    })

    if (!dbUser || dbUser.role !== 'CRAFTWORKER') {
      return NextResponse.json(
        { error: 'Only craftworkers can create Stripe Connect accounts' },
        { status: 403 }
      )
    }

    if (!dbUser.craftworkerProfile) {
      return NextResponse.json(
        { error: 'Craftworker profile not found' },
        { status: 404 }
      )
    }

    // Check if already has Stripe account
    if (dbUser.craftworkerProfile.stripeAccountId) {
      return NextResponse.json({
        accountId: dbUser.craftworkerProfile.stripeAccountId,
        alreadyExists: true
      })
    }

    const body = await request.json()
    const validatedData = requestSchema.parse(body)

    // Create Stripe Express account
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'SI',
      email: validatedData.email,
      capabilities: {
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: {
        userId: user.id,
        platform: 'LiftGO'
      }
    })

    // Save account ID to database
    await prisma.craftworkerProfile.update({
      where: { userId: user.id },
      data: {
        stripeAccountId: account.id,
        stripeOnboardingComplete: false
      }
    })

    return NextResponse.json({
      accountId: account.id,
      alreadyExists: false
    })

  } catch (error) {
    console.error('[create-account] Error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
