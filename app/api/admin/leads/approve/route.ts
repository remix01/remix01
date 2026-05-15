import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { assertLeadTransition } from '@/lib/agent/state-machine'
import { withIdempotency } from '@/lib/idempotency/withIdempotency'
import { LeadStatus, LEAD_STATUS_MIGRATION } from '@/lib/state-machine/statuses'
import { eventBus } from '@/lib/events'

const ALL_LEAD_STATUSES = Object.values(LeadStatus) as string[]

async function handler(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { ids, status = 'active' } = body

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
  }

  const canonicalStatus = LEAD_STATUS_MIGRATION[status] ?? status
  if (!ALL_LEAD_STATUSES.includes(canonicalStatus)) {
    return NextResponse.json({ error: `Status must be one of: ${ALL_LEAD_STATUSES.join(', ')}` }, { status: 400 })
  }

  const results: { id: string; ok: boolean; error?: string }[] = []

  for (const id of ids) {
    try {
      await assertLeadTransition(id, canonicalStatus)

      const { error } = await supabaseAdmin
        .from('obrtnik_profiles')
        .update({ profile_status: canonicalStatus, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) {
        results.push({ id, ok: false, error: error.message })
      } else {
        results.push({ id, ok: true })
        eventBus.emit('lead.transitioned', {
          leadId: id,
          fromStatus: 'unknown',
          toStatus: canonicalStatus,
          actor: 'admin',
          transitionedAt: new Date().toISOString(),
        })
      }
    } catch (err: any) {
      results.push({ id, ok: false, error: err.error ?? String(err) })
    }
  }

  const succeeded = results.filter((r) => r.ok)
  const failed = results.filter((r) => !r.ok)

  return NextResponse.json({
    ok: failed.length === 0,
    updated: succeeded.length,
    failed: failed.length,
    status: canonicalStatus,
    details: failed.length > 0 ? failed : undefined,
  })
}

export const POST = withIdempotency(handler)
