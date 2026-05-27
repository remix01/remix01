import { NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin, logAction } from '@/lib/supabase-admin'
import { transitionOnboardingState } from '@/lib/onboarding/state-machine'
import { sendNotification } from '@/lib/notifications'

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
    .select('id, verification_status, is_verified')
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

  // Sync verifications queue: mark any pending verification for this provider as approved
  await supabaseAdmin
    .from('verifications')
    .update({
      status: 'approved',
      reviewed_by: admin.id,
      reviewed_at: new Date().toISOString(),
      notes: 'Odobril administrator',
    })
    .eq('obrtnik_id', id)
    .eq('status', 'pending')

  try {
    await transitionOnboardingState(id)
  } catch (error) {
    console.error('[admin-provider-approve] onboarding transition failed:', error)
  }

  // Only notify if transitioning from a non-verified state (idempotency guard)
  if (current.verification_status !== 'verified') {
    sendNotification({
      userId: id,
      type: 'profil_verificiran',
      title: 'Vaš profil je bil verificiran',
      message: 'Čestitamo! Administrator je odobril vaš profil. Zdaj ste vidni naročnikom.',
      link: '/obrtnik/dashboard',
      metadata: { verified_by: admin.id },
    }).catch((e) => console.error('[admin-provider-approve] notification failed:', e))
  }

  return NextResponse.json({ success: true, provider: updated })
}
