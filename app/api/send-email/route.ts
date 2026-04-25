import { NextRequest, NextResponse } from 'next/server'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { emailLimiter } from '@/lib/rate-limit/limiters'
import { z } from 'zod'
import { getDefaultFrom, getResendClient, resolveEmailRecipients } from '@/lib/resend'
import { env } from '@/lib/env'

const sendEmailSchema = z.object({
  povprasevanje_id: z.string().min(1),
  obrtnik_id: z.string().min(1),
  email: z.string().email().optional(),
})

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function postHandler(request: NextRequest) {
  try {
    const resend = getResendClient()
    if (!resend) {
      console.log('[v0] RESEND_API_KEY not configured, skipping email');
      return NextResponse.json({
        success: false,
        message: 'Email service not configured',
      });
    }

    const body = await request.json();
    const parsed = sendEmailSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      )
    }

    const { povprasevanje_id, obrtnik_id, email } = parsed.data
    const safePovprasevanjeId = escapeHtml(povprasevanje_id)
    const safeObrtnikId = escapeHtml(obrtnik_id)

    const emailContent = `
      <h2>Novo povpraševanje na LiftGO</h2>
      <p>Prispelo je novo povpraševanje!</p>
      <p><strong>ID povpraševanja:</strong> ${safePovprasevanjeId}</p>
      <p><strong>Obrtnik ID:</strong> ${safeObrtnikId}</p>
      <p>Prijavite se v nadzorno ploščo, da vidite podrobnosti.</p>
      <p><a href="${env.NEXT_PUBLIC_APP_URL}/dashboard">Odpri dashboard</a></p>
    `;

    const response = await resend.emails.send({
      from: getDefaultFrom(),
      to: resolveEmailRecipients(email || 'contractor@example.com').to,
      subject: 'Novo povpraševanje na LiftGO',
      html: emailContent,
    });

    if (response.error) {
      const error = response.error;
      console.error('[v0] Resend error:', error);
      return NextResponse.json(
        { error: 'Email service error', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      email_id: response.data?.id,
      message: 'Email notification sent',
    });
  } catch (error) {
    console.error('[v0] API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export const POST = withRateLimit(emailLimiter, postHandler)
