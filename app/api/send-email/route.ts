import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY;

export async function POST(request: NextRequest) {
  try {
    if (!RESEND_API_KEY) {
      console.log('[v0] RESEND_API_KEY not configured, skipping email');
      return NextResponse.json({
        success: false,
        message: 'Email service not configured',
      });
    }

    const body = await request.json();
    const { povprasevanje_id, obrtnik_id, email } = body;

    const emailContent = `
      <h2>Novo povpraševanje na LiftGO</h2>
      <p>Prispelo je novo povpraševanje!</p>
      <p><strong>ID povpraševanja:</strong> ${povprasevanje_id}</p>
      <p><strong>Obrtnik ID:</strong> ${obrtnik_id}</p>
      <p>Prijavite se v nadzorno ploščo, da vidite podrobnosti.</p>
      <p><a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard">Odpri dashboard</a></p>
    `;

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@liftgo.net',
        to: email || 'contractor@example.com',
        subject: 'Novo povpraševanje na LiftGO',
        html: emailContent,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('[v0] Resend error:', error);
      return NextResponse.json(
        { error: 'Email service error', details: error },
        { status: 500 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      email_id: result.id,
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
