import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
    const { data: dbUser, error: userError } = await supabaseAdmin
      .from('user')
      .select('role, craftworker_profile(*)')
      .eq('id', user.id)
      .single()

    if (userError || !dbUser || dbUser.role !== 'CRAFTWORKER') {
      return NextResponse.json(
        { error: 'Only craftworkers can create Stripe Connect accounts' },
        { status: 403 }
      )
    }

    const craftworkerProfile = Array.isArray(dbUser.craftworker_profile) 
      ? dbUser.craftworker_profile[0] 
      : dbUser.craftworker_profile

    if (!craftworkerProfile) {
      return NextResponse.json(
        { error: 'Craftworker profile not found' },
        { status: 404 }
      )
    }

    // Check if already has Stripe account
    if (craftworkerProfile.stripe_account_id) {
      return NextResponse.json({
        accountId: craftworkerProfile.stripe_account_id,
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
    const { error: updateError } = await supabaseAdmin
      .from('craftworker_profile')
      .update({
        stripe_account_id: account.id,
        stripe_onboarding_complete: false
      })
      .eq('user_id', user.id)

    if (updateError) throw new Error(updateError.message)

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
