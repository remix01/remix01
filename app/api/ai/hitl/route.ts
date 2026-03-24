/**
 * POST /api/ai/hitl
 *
 * Creates a new Human-in-the-Loop approval request.
 * Called by AI agents when they reach a decision point requiring human review.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { createHITLRequest, HITLError } from '@/lib/ai/patterns/human-in-the-loop'

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

interface HITLCreateRequest {
  executionId: string
  agentName: string
  description: string
  context: Record<string, unknown>
}

export async function POST(request: NextRequest) {
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

    const body: HITLCreateRequest = await request.json()
    const { executionId, agentName, description, context } = body

    if (!executionId || !agentName || !description) {
      return NextResponse.json(
        { error: 'executionId, agentName, and description are required' },
        { status: 400 }
      )
    }

    const result = await createHITLRequest({ executionId, agentName, description, context: context ?? {} })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof HITLError) {
      return NextResponse.json({ error: error.message }, { status: 422 })
    }
    console.error('[POST /api/ai/hitl]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
