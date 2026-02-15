import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user with craftworker profile
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { craftworkerProfile: true }
    })

    if (!dbUser || dbUser.role !== 'CRAFTWORKER') {
      return NextResponse.json(
        { error: 'Only craftworkers can check Stripe status' },
        { status: 403 }
      )
    }

    if (!dbUser.craftworkerProfile?.stripeAccountId) {
      return NextResponse.json({
        isComplete: false,
        hasAccount: false,
        needsInfo: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        detailsSubmitted: false,
        restrictionReason: null
      })
    }

    // Retrieve account from Stripe
    const account = await stripe.accounts.retrieve(
      dbUser.craftworkerProfile.stripeAccountId
    )

    const isComplete = 
      account.charges_enabled === true && 
      account.details_submitted === true &&
      account.payouts_enabled === true

    // Update database if status changed
    if (isComplete !== dbUser.craftworkerProfile.stripeOnboardingComplete) {
      await prisma.craftworkerProfile.update({
        where: { userId: user.id },
        data: { stripeOnboardingComplete: isComplete }
      })
    }

    // Determine if more info is needed
    const needsInfo = account.details_submitted === false || 
                     (account.requirements?.currently_due?.length ?? 0) > 0

    // Get restriction reason if exists
    let restrictionReason = null
    if (account.requirements?.disabled_reason) {
      restrictionReason = account.requirements.disabled_reason
    }

    return NextResponse.json({
      isComplete,
      hasAccount: true,
      needsInfo,
      chargesEnabled: account.charges_enabled ?? false,
      payoutsEnabled: account.payouts_enabled ?? false,
      detailsSubmitted: account.details_submitted ?? false,
      restrictionReason,
      currentlyDue: account.requirements?.currently_due ?? [],
      pendingVerification: account.requirements?.pending_verification ?? []
    })

  } catch (error) {
    console.error('[stripe-status] Error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
