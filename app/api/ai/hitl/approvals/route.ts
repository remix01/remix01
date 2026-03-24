/**
 * GET /api/ai/hitl/approvals?userId=<id>
 *
 * Returns all pending HITL approval requests for a given user.
 * Used to build admin inbox / notification panels.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { getPendingApprovals, HITLError } from '@/lib/ai/patterns/human-in-the-loop'

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

export async function GET(request: NextRequest) {
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

    // Use the authenticated user's ID (ignore query param — always scope to caller)
    const approvals = await getPendingApprovals(user.id)

    return NextResponse.json({ approvals, count: approvals.length })
  } catch (error) {
    if (error instanceof HITLError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('[GET /api/ai/hitl/approvals]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
