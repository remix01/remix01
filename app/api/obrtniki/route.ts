import { supabaseAdmin, verifyAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { partnerService, handleServiceError } from '@/lib/services'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const storitev = searchParams.get('storitev') || undefined
  const lokacija = searchParams.get('lokacija') || undefined
  const adminReq = searchParams.get('admin') === 'true'

  const admin = adminReq ? await verifyAdmin(req) : null

  try {
    // Delegate to service layer
    const data = await partnerService.getObrtniki({
      storitev,
      lokacija,
      includeUnverified: !!admin,
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('[obrtniki] error:', error)
    return handleServiceError(error)
  }
}

export async function POST(req: Request) {
  const admin = await verifyAdmin(req)
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()

    // Delegate to service layer
    const data = await partnerService.createObrtnik(body)

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('[obrtniki] POST error:', error)
    return handleServiceError(error)
  }
}
