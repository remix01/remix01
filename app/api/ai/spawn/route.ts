/**
 * POST /api/ai/spawn
 *
 * Dynamically spawns AI agents based on task complexity.
 * Body: { task: string, taskId?: string, mode?: 'auto' | 'pool', configs?: SpawnConfig[] }
 *
 * - mode 'auto' (default): analyses complexity and spawns recommended agents
 * - mode 'pool': spawns the explicitly provided configs in parallel
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import {
  autoSpawn,
  spawnAgentPool,
  type SpawnConfig,
} from '@/lib/ai/patterns/dynamic-spawn'
import { AgentAccessError, QuotaExceededError } from '@/lib/ai/orchestrator'

const supabaseAdmin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

interface SpawnRequest {
  task: string
  taskId?: string
  mode?: 'auto' | 'pool'
  configs?: SpawnConfig[]
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

    const body: SpawnRequest = await request.json()
    const { task, taskId, mode = 'auto', configs } = body

    if (!task) {
      return NextResponse.json({ error: 'task is required' }, { status: 400 })
    }

    if (mode === 'pool') {
      if (!configs?.length) {
        return NextResponse.json(
          { error: 'configs are required for pool mode' },
          { status: 400 }
        )
      }
      const result = await spawnAgentPool(user.id, configs)
      return NextResponse.json(result)
    }

    // Default: auto mode
    const result = await autoSpawn(user.id, { taskDescription: task, taskId })
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof AgentAccessError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }
    if (error instanceof QuotaExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 })
    }
    console.error('[POST /api/ai/spawn]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
