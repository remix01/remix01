/**
 * POST /api/ai/hitl/approve/[id]
 *
 * Approves or rejects a pending HITL request.
 * Body: { action: 'approve' | 'reject', note?: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { approveRequest, rejectRequest, HITLError } from '@/lib/ai/patterns/human-in-the-loop'

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

interface ApproveBody {
  action: 'approve' | 'reject'
  note?: string
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Authenticate
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'Missing approval id' }, { status: 400 })
    }

    const body: ApproveBody = await request.json()
    const { action, note } = body

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: 'action must be "approve" or "reject"' },
        { status: 400 }
      )
    }

    const result = action === 'approve'
      ? await approveRequest(id, user.id, note)
      : await rejectRequest(id, user.id, note)

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof HITLError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('[POST /api/ai/hitl/approve/[id]]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
