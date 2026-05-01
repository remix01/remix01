import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin, logAction } from '@/lib/supabase-admin'
import { transitionOnboardingState } from '@/lib/onboarding/state-machine'
import { onProviderApproved } from '@/lib/email/liftgo-integration'

async function writeTransitionLog(input: {
  providerId: string
  fromState: string | null
  toState: string
  actor: string
  reason: string | null
}) {
  await supabaseAdmin.from('provider_approval_transitions').insert({
    provider_id: input.providerId,
    from_state: input.fromState,
    to_state: input.toState,
    actor: input.actor,
    reason: input.reason,
  })
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { data: current, error: currentError } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, verification_status, is_verified, business_name')
    .eq('id', id)
    .maybeSingle()

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  const updates = {
    verification_status: 'verified',
    is_verified: true,
    verified_at: new Date().toISOString(),
    blocked_reason: null,
  }

  const { data: updated, error: updateError } = await supabaseAdmin
    .from('obrtnik_profiles')
    .update(updates)
    .eq('id', id)
    .select('id, verification_status, is_verified')
    .single()

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  await writeTransitionLog({
    providerId: id,
    fromState: current.verification_status,
    toState: updated.verification_status,
    actor: admin.id,
    reason: null,
  })

  await logAction(admin.id, 'PROVIDER_APPROVED', 'obrtnik_profiles', id, current, updates)

  try {
    await transitionOnboardingState(id)
  } catch (error) {
    console.error('[admin-provider-approve] onboarding transition failed:', error)
  }

  // Send approval welcome email — fetch profile separately to get email + name
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('email, full_name')
    .eq('id', id)
    .maybeSingle()

  if (profile?.email) {
    try {
      await onProviderApproved(
        profile.email,
        profile.full_name || profile.email,
        current.business_name || 'LiftGO Partner'
      )
    } catch (emailError) {
      console.error('[admin-provider-approve] approval email failed:', emailError)
    }
  }

  return NextResponse.json({ success: true, provider: updated })
}
