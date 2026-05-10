import { NextResponse } from 'next/server'
import { z } from 'zod'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { CANONICAL_TABLES, CANONICAL_PROVIDER_RELATIONSHIP } from '@/lib/db/schema-contract'

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

    const { data: profile, error: profileError } = await supabaseAdmin
      .from(CANONICAL_TABLES.user)
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'obrtnik') {
      return NextResponse.json(
        { error: 'Only providers can create Stripe Connect accounts' },
        { status: 403 }
      )
    }

    const { data: providerProfile, error: providerError } = await supabaseAdmin
      .from(CANONICAL_TABLES.provider)
      .select('id, stripe_account_id')
      .eq(CANONICAL_PROVIDER_RELATIONSHIP.key, user.id)
      .single()
    if (providerError || !providerProfile) {
      return NextResponse.json(
        { error: 'Provider profile not found' },
        { status: 404 }
      )
    }

    // Check if already has Stripe account
    if (providerProfile.stripe_account_id) {
      return NextResponse.json({
        accountId: providerProfile.stripe_account_id,
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
      .from(CANONICAL_TABLES.provider)
      .update({
        stripe_account_id: account.id,
        stripe_onboarded: false
      })
      .eq(CANONICAL_PROVIDER_RELATIONSHIP.key, user.id)

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
