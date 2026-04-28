import { ok, fail } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { CreateOfferPayload } from '@/lib/types/offer'
import {
  partnerOfferService,
  PartnerOfferServiceError,
} from '@/lib/partner/offers/service'

async function withPartnerAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: fail('UNAUTHORIZED', 'Unauthorized', 401) as const }
  }

  return { supabase, userId: user.id }
}

function handleRouteError(error: unknown, routeTag: string) {
  if (error instanceof PartnerOfferServiceError) {
    return fail(error.code, error.message, error.status)
  }

  console.error(`[${routeTag}] unexpected error:`, error)
  return fail('INTERNAL_ERROR', 'Prišlo je do nepričakovane napake.', 500)
}

export async function GET() {
  const auth = await withPartnerAuth()
  if ('error' in auth) return auth.error

  try {
    const offers = await partnerOfferService.list(auth.supabase, auth.userId)
    return ok(offers)
  } catch (error) {
    return handleRouteError(error, 'GET /api/partner/offers')
  }
}

export async function POST(req: Request) {
  const auth = await withPartnerAuth()
  if ('error' in auth) return auth.error

  try {
    const body: CreateOfferPayload = await req.json()
    const created = await partnerOfferService.create(auth.supabase, auth.userId, body)

    return ok(created, undefined, 201)
  } catch (error) {
    return handleRouteError(error, 'POST /api/partner/offers')
  }
}
