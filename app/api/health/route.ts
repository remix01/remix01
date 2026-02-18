/**
 * Health Check Endpoint
 * No authentication required - safe for uptime monitoring services
 * Checks database connectivity and returns system status
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface HealthCheck {
  database: 'ok' | 'error'
}

interface HealthResponse {
  status: 'ok' | 'degraded'
  version: string
  checks: HealthCheck
  timestamp: string
}

export async function GET() {
  const checks: HealthCheck = {
    database: 'error',
  }

  try {
    // Check Supabase database connectivity
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Simple connectivity check - SELECT 1
    const { error } = await supabase.from('User').select('id').limit(1).single()
    
    // If no error or just no rows found, database is accessible
    if (!error || error.code === 'PGRST116') {
      checks.database = 'ok'
    }
  } catch (error) {
    console.error('[Health Check] Database check failed:', error)
    checks.database = 'error'
  }

  // Determine overall status
  const allChecksOk = Object.values(checks).every((check) => check === 'ok')
  const status = allChecksOk ? 'ok' : 'degraded'

  const response: HealthResponse = {
    status,
    version: 'v1',
    checks,
    timestamp: new Date().toISOString(),
  }

  // Return 503 if database is down
  const httpStatus = status === 'ok' ? 200 : 503

  return NextResponse.json(response, { status: httpStatus })
}
