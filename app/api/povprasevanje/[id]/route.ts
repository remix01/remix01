import { supabaseAdmin, verifyAdmin, logAction } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'
import { checkEmailRateLimit, escapeHtml, sanitizeText } from '@/lib/email/security'
import { writeEmailLog } from '@/lib/email/email-logs'

const resend = getResendClient()

function successResponse<T extends Record<string, unknown>>(legacy: T, status = 200) {
  return NextResponse.json(
    {
      ok: true,
      data: legacy,
      ...legacy,
    },
    { status }
  )
}

function errorResponse(message: string, status: number, code: string) {
  return NextResponse.json(
    {
      ok: false,
      data: null,
      error: message,
      error_details: { code, message },
    },
    { status }
  )
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')

  const { id } = await params

  const { data, error } = await supabaseAdmin
    .from('povprasevanja')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return errorResponse('Not found', 404, 'NOT_FOUND')

  return successResponse(data)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await verifyAdmin(req)
  if (!admin) return errorResponse('Unauthorized', 401, 'UNAUTHORIZED')

  const { id } = await params
  const body = await req.json()
  const { status, obrtnik_id, admin_opomba,
          termin_datum, termin_ura,
          cena_ocena_min, cena_ocena_max } = body

  // Get current state for audit log
  const { data: current } = await supabaseAdmin
    .from('povprasevanja')
    .select('*')
    .eq('id', id)
    .single()

  if (!current) return errorResponse('Not found', 404, 'NOT_FOUND')

  const updates: Record<string, unknown> = {}
  if (status !== undefined) updates.status = status
  if (obrtnik_id !== undefined) updates.obrtnik_id = obrtnik_id || null
  if (admin_opomba !== undefined) updates.admin_opomba = admin_opomba
  if (termin_datum !== undefined) updates.termin_datum = termin_datum
  if (termin_ura !== undefined) updates.termin_ura = termin_ura
  if (cena_ocena_min !== undefined) updates.cena_ocena_min = cena_ocena_min
  if (cena_ocena_max !== undefined) updates.cena_ocena_max = cena_ocena_max

  // Auto-set status when assigning obrtnik
  if (obrtnik_id && !status) updates.status = 'dodeljeno'

  const { data, error } = await supabaseAdmin
    .from('povprasevanja')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return errorResponse(error.message, 500, 'DB_UPDATE_FAILED')

  // Log the action
  await logAction(admin.id, 'UPDATE', 'povprasevanja', id, current, updates)

  // Notify obrtnik if newly assigned
  if (obrtnik_id && obrtnik_id !== current.obrtnik_id) {
    const { data: obrtnik } = await supabaseAdmin
      .from('obrtniki')
      .select('email, ime')
      .eq('id', obrtnik_id)
      .single()

    if (obrtnik?.email && resend) {
      const notificationRateLimit = await checkEmailRateLimit({
        request: req,
        action: 'admin_test',
        email: obrtnik.email,
        userId: admin.id,
      })

      if (!notificationRateLimit.allowed) {
        await writeEmailLog({
          email: obrtnik.email,
          type: 'partner_assignment_notification',
          status: 'rate_limited',
          userId: admin.id,
          errorMessage: `Rate limited by ${notificationRateLimit.reason}`,
          metadata: { endpoint: '/api/povprasevanje/[id]', inquiryId: id },
        })
      } else {
        try {
          await writeEmailLog({
            email: obrtnik.email,
            type: 'partner_assignment_notification',
            status: 'pending',
            userId: admin.id,
            metadata: { endpoint: '/api/povprasevanje/[id]', inquiryId: id },
          })

          const safeName = escapeHtml(sanitizeText(obrtnik.ime || '', 120))
          const safeService = escapeHtml(sanitizeText(current.storitev || '', 120))
          const safeLocation = escapeHtml(sanitizeText(current.lokacija || '', 120))

          const response = await resend.emails.send({
            from: getDefaultFrom(),
            to: resolveEmailRecipients(obrtnik.email).to,
            subject: 'LiftGO — Dodeljeno vam je novo povpraševanje',
            html: `
              <h2>Pozdravljeni ${safeName},</h2>
              <p>Admin vam je dodelil novo povpraševanje.</p>
              <p><strong>Storitev:</strong> ${safeService}</p>
              <p><strong>Lokacija:</strong> ${safeLocation}</p>
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/obrtnik/povprasevanja/${id}">
                Oglejte si podrobnosti →
              </a>
            `,
          })

          if (response.error) {
            await writeEmailLog({
              email: obrtnik.email,
              type: 'partner_assignment_notification',
              status: 'failed',
              userId: admin.id,
              errorMessage: response.error.message,
              metadata: { endpoint: '/api/povprasevanje/[id]', inquiryId: id },
            })
          } else {
            await writeEmailLog({
              email: obrtnik.email,
              type: 'partner_assignment_notification',
              status: 'sent',
              userId: admin.id,
              resendEmailId: response.data?.id,
              metadata: { endpoint: '/api/povprasevanje/[id]', inquiryId: id },
            })

            await supabaseAdmin
              .from('povprasevanja')
              .update({ notifikacija_poslana: true, notifikacija_cas: new Date().toISOString() })
              .eq('id', id)
          }
        } catch (emailError) {
          await writeEmailLog({
            email: obrtnik.email,
            type: 'partner_assignment_notification',
            status: 'failed',
            userId: admin.id,
            errorMessage: emailError instanceof Error ? emailError.message : 'Unknown email error',
            metadata: { endpoint: '/api/povprasevanje/[id]', inquiryId: id },
          })
          console.log('[v0] Email send skipped')
        }
      }
    }
  }

  return successResponse(data as Record<string, unknown>)
}
