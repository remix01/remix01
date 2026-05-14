import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
      legacy_error: message,
    },
    { status }
  )
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return errorResponse(401, 'UNAUTHORIZED', 'Unauthorized')
    }

    // Canonical identity mapping for craftsman profile: obrtnik_profiles.id = auth.uid()
    let resolvedObrtnikId: string | null = null

    const { data: canonicalProfile, error: canonicalError } = await supabaseAdmin
      .from('obrtnik_profiles')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (canonicalError) {
      return errorResponse(500, 'PROFILE_RESOLVE_FAILED', 'Failed to resolve profile')
    }

    if (canonicalProfile?.id) {
      resolvedObrtnikId = canonicalProfile.id
    } else {
      // Legacy fallback for schemas where obrtnik_profiles.user_id is still the linkage.
      // TODO(migration): remove this fallback after all profiles are migrated to id=auth.uid().
      const { data: legacyProfile, error: legacyError } = await (supabaseAdmin as any)
        .from('obrtnik_profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (legacyError) {
        return errorResponse(500, 'PROFILE_RESOLVE_FAILED', 'Failed to resolve profile')
      }

      if (legacyProfile?.id) {
        resolvedObrtnikId = legacyProfile.id
        console.warn(
          JSON.stringify({
            level: 'warn',
            code: 'OBRTNIK_IDENTITY_LEGACY_FALLBACK',
            endpoint: '/api/obrtnik/povprasevanja',
            authUserId: user.id,
            resolvedObrtnikId,
            message:
              'Resolved craftsman identity via legacy obrtnik_profiles.user_id mapping. TODO: migrate to canonical id=auth.uid().',
          })
        )
      }
    }

    if (!resolvedObrtnikId) {
      return errorResponse(403, 'PROFILE_NOT_FOUND', 'Obrtnik profile not found')
    }

    const requestedObrtnikId = request.nextUrl.searchParams.get('obrtnik_id')
    if (requestedObrtnikId && requestedObrtnikId !== resolvedObrtnikId) {
      return errorResponse(403, 'FORBIDDEN', 'Forbidden')
    }

    if (requestedObrtnikId && requestedObrtnikId === resolvedObrtnikId) {
      console.warn(
        JSON.stringify({
          level: 'warn',
          code: 'OBRTNIK_QUERY_PARAM_COMPAT',
          endpoint: '/api/obrtnik/povprasevanja',
          authUserId: user.id,
          obrtnikId: requestedObrtnikId,
          message:
            'Compatibility query param obrtnik_id is still in use. TODO: remove query-param fallback and rely only on authenticated identity.',
        })
      )
    }

    // Get all inquiries for this contractor
    const { data, error } = await supabaseAdmin
      .from('povprasevanja')
      .select(
        `
        id,
        storitev,
        lokacija,
        opis,
        termin_datum,
        termin_ura,
        status,
        email,
        telefon,
        created_at
      `
      )
      .eq('obrtnik_id', resolvedObrtnikId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[v0] Query error:', error)
      return errorResponse(500, 'QUERY_FAILED', error.message)
    }

    // Best-effort lead flow tracking: contractor opened lead list
    if (data?.length) {
      const openedIds = data.map((p) => p.id)
      try {
        const updateResult = await supabaseAdmin
          .from('povprasevanja')
          .update({ lead_status: 'opened' } as any)
          .in('id', openedIds)
          .eq('lead_status', 'matched')

        if (updateResult.error) {
          console.warn('[lead-flow] opened status update skipped:', updateResult.error)
        } else {
          await supabaseAdmin.from('lead_audit_log').insert(
          openedIds.map((id) => ({
            povprasevanje_id: id,
            status: 'opened',
            actor_type: 'contractor',
            actor_id: resolvedObrtnikId,
            metadata: { endpoint: '/api/obrtnik/povprasevanja' },
          }))
          )
        }
      } catch (trackingError) {
        console.warn('[lead-flow] opened tracking skipped:', trackingError)
      }
    }

    // Group by status
    const grouped = {
      novo: data?.filter((p) => p.status === 'novo') || [],
      sprejeto: data?.filter((p) => p.status === 'sprejeto') || [],
      zavrnjeno: data?.filter((p) => p.status === 'zavrnjeno') || [],
      zakljuceno: data?.filter((p) => p.status === 'zakljuceno') || [],
    }

    return NextResponse.json({
      ok: true,
      success: true,
      inquiries: data || [],
      grouped,
      total: data?.length || 0,
    })
  } catch (error) {
    console.error('[v0] API error:', error)
    return errorResponse(500, 'INTERNAL_ERROR', 'Internal server error')
  }
}
