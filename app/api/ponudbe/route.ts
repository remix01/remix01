import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { validateAmount, validateEnum, validateRequiredString, collectErrors } from '@/lib/validation'
import { apiSuccess, badRequest, unauthorized, forbidden, tooManyRequests, internalError } from '@/lib/api-response'
import { offerService, handleServiceError } from '@/lib/services'
import { trackFunnelEvent, FUNNEL_EVENTS } from '@/lib/analytics/funnel'
import { sendNotification } from '@/lib/notifications'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { canonicalWriteGateway } from '@/lib/services/canonicalWriteGateway'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return unauthorized()
    }

    // Rate limit check
    const { allowed, retryAfter } = await checkRateLimit(
      `ponudbe:${user.id}`,
      10,      // max 10 ponudb
      60_000   // per minute
    )
    if (!allowed) {
      return tooManyRequests(`Too many requests. Try again in ${retryAfter}s.`)
    }

    // Parse request body
    const { povprasevanje_id, obrtnik_id, message, price_estimate, price_type, available_date } = await request.json()

    // INPUT VALIDATION - all checks before any DB calls
    const validationErrors = collectErrors(
      validateRequiredString(povprasevanje_id, 'povprasevanje_id'),
      validateRequiredString(obrtnik_id, 'obrtnik_id'),
      validateRequiredString(message, 'message'),
      validateAmount(price_estimate, 'price_estimate', 0),
      price_type ? validateEnum(price_type, 'price_type', ['fiksna', 'ocena', 'po_ogledu']) : null
    )

    if (validationErrors.length > 0) {
      return badRequest(validationErrors.map(e => `${e.field}: ${e.message}`).join('; '))
    }

    // Validate date if provided
    if (available_date) {
      const date = new Date(available_date)
      if (isNaN(date.getTime())) {
        return badRequest('available_date: Invalid date format')
      }
    }

    // Delegate to service layer
    const ponudba = await offerService.createPonudba(user.id, {
      povprasevanje_id,
      obrtnik_id,
      message,
      price_estimate,
      price_type,
      available_date,
    } as any)

    const { data: povprasevanjeMeta } = await supabaseAdmin
      .from('povprasevanja')
      .select('location_city, created_at, categories:category_id(name)')
      .eq('id', povprasevanje_id)
      .maybeSingle()

    // Best-effort lead flow tracking: contractor sent quote
    try {
      const responseTimeMs = povprasevanjeMeta?.created_at
        ? Date.now() - new Date(povprasevanjeMeta.created_at).getTime()
        : null
      await canonicalWriteGateway.createOrUpdatePovprasevanje(povprasevanje_id, { lead_status: 'quoted' } as any, 'api.ponudbe.quoted-tracking')
      await supabaseAdmin.from('lead_audit_log').insert({
        povprasevanje_id,
        status: 'quoted',
        actor_type: 'contractor',
        actor_id: user.id,
        response_time_ms: responseTimeMs,
        conversion: true,
        metadata: { endpoint: '/api/ponudbe', obrtnik_id },
      })
    } catch (trackingError) {
      console.warn('[lead-flow] quoted tracking skipped:', trackingError)
    }

    trackFunnelEvent(FUNNEL_EVENTS.PONUDBA_SENT, {
      povprasevanje_id,
      category: (povprasevanjeMeta?.categories as { name?: string } | null)?.name ?? null,
      location: povprasevanjeMeta?.location_city ?? null,
      user_type: 'obrtnik',
      obrtnik_id,
    }, user.id)
    trackFunnelEvent(FUNNEL_EVENTS.OFFER_SUBMITTED, {
      povprasevanje_id,
      category: (povprasevanjeMeta?.categories as { name?: string } | null)?.name ?? null,
      location: povprasevanjeMeta?.location_city ?? null,
      user_type: 'obrtnik',
      obrtnik_id,
    }, user.id)

    // Notify naročnik about new ponudba (fire-and-forget)
    void (async () => {
      try {
        const { data: pov } = await supabaseAdmin
          .from('povprasevanja')
          .select('narocnik_id, title, profiles:profiles!povprasevanja_narocnik_id_fkey(email, full_name)')
          .eq('id', povprasevanje_id)
          .maybeSingle()

        if (!pov?.narocnik_id) return

        await sendNotification({
          userId: pov.narocnik_id,
          type: 'nova_ponudba',
          title: 'Nova ponudba za vaše povpraševanje',
          message: `Mojster je poslal ponudbo za: ${pov.title}`,
          link: `/povprasevanja/${povprasevanje_id}`,
        })

        const narocnikEmail = (pov.profiles as any)?.email
        const narocnikName = (pov.profiles as any)?.full_name || 'Naročnik'
        const resend = getResendClient()
        if (narocnikEmail && resend) {
          try {
            await resend.emails.send({
              from: getDefaultFrom(),
              to: resolveEmailRecipients(narocnikEmail).to,
              subject: `Nova ponudba za vaše povpraševanje`,
              html: `
                <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;">
                  <h2 style="color:#0d9488;">Prejeli ste novo ponudbo!</h2>
                  <p>Pozdravljeni ${narocnikName},</p>
                  <p>Mojster je poslal ponudbo za vaše povpraševanje: <strong>${pov.title}</strong></p>
                  <div style="margin:24px 0;">
                    <a href="https://liftgo.net/povprasevanja/${povprasevanje_id}"
                       style="background:#0d9488;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;">
                      Poglej ponudbo →
                    </a>
                  </div>
                  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
                  <p style="color:#94a3b8;font-size:12px;">LiftGO — <a href="https://liftgo.net" style="color:#0d9488;">liftgo.net</a></p>
                </div>
              `,
            })
          } catch (err) {
            console.error('[ponudbe] Email error:', err)
          }
        }
      } catch (err) {
        console.error('[ponudbe] Notify error:', err)
      }
    })()

    return apiSuccess(ponudba)
  } catch (error) {
    console.error('[v0] Error creating ponudba:', error)
    return handleServiceError(error)
  }
}
