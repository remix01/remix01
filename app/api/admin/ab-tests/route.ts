import { NextResponse } from 'next/server'
import { AB_TESTS, getABMetrics } from '@/lib/ai/ab-testing'

export async function GET() {
  return NextResponse.json({
    tests: AB_TESTS,
    metrics: getABMetrics(),
  })
}
