import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/email/resend-utils'
import { env } from '@/lib/env'

export async function POST(request: NextRequest) {
  try {
    if (!env.RESEND_API_KEY) {
      console.log('[send-email] RESEND_API_KEY not configured, skipping email')
      return NextResponse.json({
        success: false,
        message: 'Email service not configured',
      })
    }

    const body = await request.json()
    const { povprasevanje_id, obrtnik_id, email } = body

    const html = `
      <h2>Novo povpraševanje na LiftGO</h2>
      <p>Prispelo je novo povpraševanje!</p>
      <p><strong>ID povpraševanja:</strong> ${povprasevanje_id}</p>
      <p><strong>Obrtnik ID:</strong> ${obrtnik_id}</p>
      <p>Prijavite se v nadzorno ploščo, da vidite podrobnosti.</p>
      <p><a href="${env.NEXT_PUBLIC_APP_URL}/dashboard">Odpri dashboard</a></p>
    `

    const result = await sendEmail({
      to: email || 'contractor@example.com',
      subject: 'Novo povpraševanje na LiftGO',
      html,
      eventType: 'new-inquiry',
      entityId: povprasevanje_id || obrtnik_id || 'unknown',
    })

    if (!result.success) {
      console.error('[send-email] Resend error:', result.error)
      return NextResponse.json(
        { error: 'Email service error', details: result.error },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      email_id: result.messageId,
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
