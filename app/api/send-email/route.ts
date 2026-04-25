import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { emailLimiter } from '@/lib/rate-limit/limiters'
import { z } from 'zod'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'
import { env } from '@/lib/env'
import { checkEmailRateLimit, escapeHtml, isHoneypotTriggered, sanitizeText } from '@/lib/email/security'
import { writeEmailLog } from '@/lib/email/email-logs'

const sendEmailSchema = z.object({
  povprasevanje_id: z.string().trim().min(1).max(120),
  obrtnik_id: z.string().trim().min(1).max(120),
  email: z.string().trim().email().optional(),
  user_id: z.string().trim().max(120).optional(),
  website: z.string().trim().max(300).optional(),
})

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json()
    const parsed = sendEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      )
    }

    const { povprasevanje_id, obrtnik_id, email, website } = parsed.data
    // SECURITY: Never trust user_id from public payload for shared rate-limit buckets.
    // This endpoint is public/test-facing, so user-based limiting is disabled here unless
    // we add authenticated context in the future.
    const limiterUserId: string | null = null

    if (isHoneypotTriggered(website)) {
      await writeEmailLog({
        email: email || 'unknown@unknown.local',
        type: 'admin_test_email',
        status: 'honeypot',
        userId: limiterUserId,
        metadata: { endpoint: '/api/send-email' },
      })

      return NextResponse.json({
        success: true,
        message: 'Email notification queued',
      })
    }

    const rl = await checkEmailRateLimit({
      request,
      action: 'admin_test',
      email: email ?? null,
      userId: limiterUserId,
    })

    if (!rl.allowed) {
      await writeEmailLog({
        email: email || 'unknown@unknown.local',
        type: 'admin_test_email',
        status: 'rate_limited',
        userId: limiterUserId,
        errorMessage: `Rate limited by ${rl.reason}`,
        metadata: { endpoint: '/api/send-email', retryAfter: rl.retryAfter },
      })
      return rl.response
    }

    const resend = getResendClient()
    if (!resend) {
      return NextResponse.json({
        success: false,
        message: 'Email service not configured',
      })
    }

    const recipient = email || 'contractor@example.com'
    await writeEmailLog({
      email: recipient,
      type: 'admin_test_email',
      status: 'pending',
      userId: limiterUserId,
      metadata: { endpoint: '/api/send-email' },
    })

    const safePovprasevanjeId = escapeHtml(sanitizeText(povprasevanje_id, 120))
    const safeObrtnikId = escapeHtml(sanitizeText(obrtnik_id, 120))

    const response = await resend.emails.send({
      from: getDefaultFrom(),
      to: resolveEmailRecipients(recipient).to,
      subject: 'Novo povpraševanje na LiftGO',
      html: `
        <h2>Novo povpraševanje na LiftGO</h2>
        <p>Prispelo je novo povpraševanje!</p>
        <p><strong>ID povpraševanja:</strong> ${safePovprasevanjeId}</p>
        <p><strong>Obrtnik ID:</strong> ${safeObrtnikId}</p>
        <p>Prijavite se v nadzorno ploščo, da vidite podrobnosti.</p>
        <p><a href="${env.NEXT_PUBLIC_APP_URL}/dashboard">Odpri dashboard</a></p>
      `,
    })

    if (response.error) {
      await writeEmailLog({
        email: recipient,
        type: 'admin_test_email',
        status: 'failed',
        userId: limiterUserId,
        errorMessage: response.error.message,
        metadata: { endpoint: '/api/send-email' },
      })
      return NextResponse.json(
        { error: 'Email service error', details: response.error.message },
        { status: 500 }
      )
    }

    await writeEmailLog({
      email: recipient,
      type: 'admin_test_email',
      status: 'sent',
      userId: limiterUserId,
      resendEmailId: response.data?.id,
      metadata: { endpoint: '/api/send-email' },
    })

    return NextResponse.json({
      success: true,
      email_id: response.data?.id,
      message: 'Email notification sent',
    })
  } catch (error) {
    console.error('[send-email] API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(emailLimiter, postHandler)
