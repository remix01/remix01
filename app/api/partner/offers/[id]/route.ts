import { ok, fail } from '@/lib/api/response'
import { createClient } from '@/lib/supabase/server'
import type { UpdateOfferPayload } from '@/lib/types/offer'
import {
  partnerOfferService,
  PartnerOfferServiceError,
} from '@/lib/partner/offers/service'
import { withCsrf } from '@/lib/csrf/with-csrf'
import { SECURITY_MESSAGES } from '@/lib/security/access'

type RouteParams = { params: Promise<{ id: string }> }

async function withPartnerAuth() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: fail('UNAUTHORIZED', SECURITY_MESSAGES.forbidden, 401) }
  }

  return { supabase, userId: user.id }
}

function handleRouteError(error: unknown, routeTag: string) {
  if (error instanceof PartnerOfferServiceError) {
    if (error.code === 'FORBIDDEN') {
      return fail(error.code, SECURITY_MESSAGES.forbidden, error.status)
    }
    return fail(error.code, error.message, error.status)
  }

  console.error(`[${routeTag}] unexpected error:`, error)
  return fail('INTERNAL_ERROR', 'Prišlo je do nepričakovane napake.', 500)
}

async function patchHandler(req: Request, { params }: RouteParams) {
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

async function deleteHandler(_req: Request, { params }: RouteParams) {
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

export const PATCH = withCsrf(patchHandler as any)
export const DELETE = withCsrf(deleteHandler as any)
