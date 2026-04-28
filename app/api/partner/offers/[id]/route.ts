import { ok, fail } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { UpdateOfferPayload } from '@/lib/types/offer'
import {
  partnerOfferService,
  PartnerOfferServiceError,
} from '@/lib/partner/offers/service'

type RouteParams = { params: Promise<{ id: string }> }

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

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await withPartnerAuth()
  if ('error' in auth) return auth.error

  const { id } = await params

  try {
    const body: UpdateOfferPayload = await req.json()
    const updated = await partnerOfferService.update(auth.supabase, auth.userId, id, body)

    return ok(updated)
  } catch (error) {
    return handleRouteError(error, 'PATCH /api/partner/offers/[id]')
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await withPartnerAuth()
  if ('error' in auth) return auth.error

  const { id } = await params

  try {
    const result = await partnerOfferService.remove(auth.supabase, auth.userId, id)
    return ok(result)
  } catch (error) {
    return handleRouteError(error, 'DELETE /api/partner/offers/[id]')
  }
}
