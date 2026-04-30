import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin, logAction } from '@/lib/supabase-admin'
import { transitionOnboardingState } from '@/lib/onboarding/state-machine'

async function writeTransitionLog(input: {
  providerId: string
  fromState: string | null
  toState: string
  actor: string
  reason: string
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
  const body = await req.json().catch(() => ({}))
  const reason = typeof body.reason === 'string' ? body.reason.trim() : ''

  if (!reason) {
    return NextResponse.json({ error: 'Rejection reason is required' }, { status: 400 })
  }

  const { data: current, error: currentError } = await supabaseAdmin
    .from('obrtnik_profiles')
    .select('id, verification_status, is_verified')
    .eq('id', id)
    .maybeSingle()

  if (currentError) return NextResponse.json({ error: currentError.message }, { status: 500 })
  if (!current) return NextResponse.json({ error: 'Provider not found' }, { status: 404 })

  const updates = {
    verification_status: 'rejected',
    is_verified: false,
    blocked_reason: reason,
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
    reason,
  })

  await logAction(admin.id, 'PROVIDER_REJECTED', 'obrtnik_profiles', id, current, updates)

  try {
    await transitionOnboardingState(id)
  } catch (error) {
    console.error('[admin-provider-reject] onboarding transition failed:', error)
  }

  return NextResponse.json({ success: true, provider: updated })
}
