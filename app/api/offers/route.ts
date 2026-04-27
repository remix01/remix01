import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { offerService, handleServiceError } from '@/lib/services'

function successResponse<T>(data: T) {
  return NextResponse.json({
    ok: true,
    success: true,
    data,
  })
}

function errorResponse(message: string, status: number, code: string) {
  return NextResponse.json(
    {
      ok: false,
      success: false,
      data: null,
      error: message,
      error_details: { code, message },
    },
    { status }
  )
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    // Check user's role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = profile?.role

    const { searchParams } = new URL(request.url)
    const partnerId = searchParams.get('partner_id') || undefined

    // Delegate to service layer
    const offers = await offerService.getOffers(user.id, userRole, partnerId)

    return successResponse(offers)
  } catch (error: unknown) {
    console.error('[API] Error fetching offers:', error)
    return handleServiceError(error)
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')
    }

    const body = await request.json()

    // Delegate to service layer
    const offer = await offerService.createOffer(user.id, body)

    return successResponse(offer)
  } catch (error: unknown) {
    console.error('[API] Error creating offer:', error)
    return handleServiceError(error)
  }
}
