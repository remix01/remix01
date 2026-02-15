import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

const requestSchema = z.object({
  accountId: z.string(),
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
        { error: 'Only craftworkers can access onboarding' },
        { status: 403 }
      )
    }

    if (!dbUser.craftworkerProfile?.stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account found. Create one first.' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const validatedData = requestSchema.parse(body)

    // Verify the account ID matches the user's account
    if (validatedData.accountId !== dbUser.craftworkerProfile.stripeAccountId) {
      return NextResponse.json(
        { error: 'Account ID mismatch' },
        { status: 403 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // Create account link
    const accountLink = await stripe.accountLinks.create({
      account: validatedData.accountId,
      refresh_url: `${baseUrl}/dashboard/stripe-return?refresh=true`,
      return_url: `${baseUrl}/dashboard/stripe-return?success=true`,
      type: 'account_onboarding',
    })

    return NextResponse.json({
      url: accountLink.url
    })

  } catch (error) {
    console.error('[create-onboarding-link] Error:', error)
    
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
