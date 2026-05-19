import { NextRequest, NextResponse } from 'next/server'
import { verifyAdmin } from '@/lib/supabase-admin'
import { AB_TESTS, getABMetrics } from '@/lib/ai/ab-testing'

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    tests: AB_TESTS,
    metrics: getABMetrics(),
  })
}
