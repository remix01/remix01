// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_URL = 'https://api.resend.com/emails'
const FROM_EMAIL = 'LiftGO <noreply@liftgo.net>'
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'https://v0-liftgo-platform-concept-info-36187542s-projects.vercel.app'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

interface EmailRequest {
  type: 'partner_welcome' | 'partner_updated' | 'customer_welcome'
  data: Record<string, string>
}

interface PartnerWelcomeData {
  partnerName: string
  businessName: string
  email: string
  loginUrl?: string
  tempPassword?: string
}

function buildPartnerWelcomeHtml(data: PartnerWelcomeData): string {
  const loginUrl = data.loginUrl || `${FRONTEND_URL}/prijava`
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
    .header .logo { font-size: 32px; font-weight: 800; letter-spacing: 2px; margin-bottom: 12px; }
    .content { padding: 32px 30px; }
    .section { margin-bottom: 24px; }
    .highlight-box { background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .button { display: inline-block; background: #2563eb; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 8px 0; }
    .cta-section { text-align: center; margin: 32px 0; }
    .footer { background: #f9fafb; padding: 24px 30px; text-align: center; font-size: 13px; color: #6b7280; }
    .footer a { color: #2563eb; text-decoration: none; margin: 0 8px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Dobrodošli v LiftGO!</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Pozdravljeni, <strong>${data.partnerName}</strong>!</p>
        <p>Veseli smo, da se pridružujete platformi LiftGO kot partner podjetja <strong>${data.businessName}</strong>.</p>
      </div>

      <div class="highlight-box">
        <strong>Vaš račun je aktiven.</strong> Prijavite se in začnite sprejemati povpraševanja!
      </div>

      <div class="section">
        <h2>Kaj je naslednji korak?</h2>
        <p>1. Prijavite se v portal za obrtnike</p>
        <p>2. Dopolnite svoj profil in dodajte storitve</p>
        <p>3. Začnite sprejemati povpraševanja strank</p>
      </div>
      ${data.tempPassword ? `
      <div class="section">
        <p><strong>Začasno geslo:</strong> <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px;">${data.tempPassword}</code></p>
        <p><em>Prosimo, da geslo zamenjate ob prvi prijavi.</em></p>
      </div>` : ''}
      <div class="cta-section">
        <a href="${loginUrl}" class="button">Prijava v LiftGO</a>
      </div>

      <hr>
      <p style="font-size:14px;color:#6b7280;">Imate vprašanja? Pišite nam na <a href="mailto:support@liftgo.net">support@liftgo.net</a></p>
    </div>
    <div class="footer">
      <div>
        <a href="${FRONTEND_URL}/pomoc">Pomoč</a>
        <a href="${FRONTEND_URL}/pogoji">Pogoji</a>
        <a href="mailto:support@liftgo.net">Kontakt</a>
      </div>
      <p style="margin-top:12px;">&copy; 2026 LiftGO. Vse pravice pridržane.</p>
    </div>
  </div>
</body>
</html>`
}

function buildCustomerWelcomeHtml(data: Record<string, string>): string {
  const loginUrl = data.loginUrl || `${FRONTEND_URL}/narocnik/dashboard`
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; font-size: 26px; font-weight: 700; }
    .header .logo { font-size: 32px; font-weight: 800; letter-spacing: 2px; margin-bottom: 12px; }
    .content { padding: 32px 30px; }
    .section { margin-bottom: 24px; }
    .highlight-box { background: #f0fdfa; border-left: 4px solid #0d9488; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .button { display: inline-block; background: #0d9488; color: white !important; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 8px 0; }
    .cta-section { text-align: center; margin: 32px 0; }
    .footer { background: #f9fafb; padding: 24px 30px; text-align: center; font-size: 13px; color: #6b7280; }
    .footer a { color: #0d9488; text-decoration: none; margin: 0 8px; }
    hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">LIFTGO</div>
      <h1>Dobrodošli v LiftGO!</h1>
    </div>
    <div class="content">
      <div class="section">
        <p>Pozdravljeni, <strong>${data.customerName || 'Naročnik'}</strong>!</p>
        <p>Veseli smo, da ste se pridružili platformi LiftGO — najhitrejšemu načinu za iskanje zanesljivih obrtnikov v Sloveniji.</p>
      </div>
      <div class="highlight-box">
        <strong>V 30 sekundah do pravega obrtnika.</strong> Oddajte povpraševanje in prejmite ponudbe od preverjenih mojstrov v vaši okolici.
      </div>
      <div class="section">
        <h2>Kako začeti?</h2>
        <p>1. Prijavite se v vaš račun</p>
        <p>2. Oddajte povpraševanje za storitev, ki jo potrebujete</p>
        <p>3. Primerjajte ponudbe in izberite najboljšega obrtnika</p>
      </div>
      <div class="cta-section">
        <a href="${loginUrl}" class="button">Začni iskati obrtnika</a>
      </div>
      <hr>
      <p style="font-size:14px;color:#6b7280;">Imate vprašanja? Pišite nam na <a href="mailto:support@liftgo.net">support@liftgo.net</a></p>
    </div>
    <div class="footer">
      <div>
        <a href="${FRONTEND_URL}/pomoc">Pomoč</a>
        <a href="${FRONTEND_URL}/pogoji">Pogoji</a>
        <a href="mailto:support@liftgo.net">Kontakt</a>
      </div>
      <p style="margin-top:12px;">&copy; 2026 LiftGO. Vse pravice pridržane.</p>
    </div>
  </div>
</body>
</html>`
}

function buildPartnerUpdatedHtml(data: Record<string, string>): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.6; color: #1f2937; background: #f3f4f6; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 32px 30px; text-align: center; }
    .header .logo { font-size: 28px; font-weight: 800; letter-spacing: 2px; }
    .content { padding: 32px 30px; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 13px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">LIFTGO</div></div>
    <div class="content">
      <p>Pozdravljeni, <strong>${data.partnerName || 'Partner'}</strong>!</p>
      <p>Vaš partnerski profil je bil posodobljen.</p>
      <p>Če niste zahtevali spremembe, nas prosimo takoj kontaktirajte na <a href="mailto:support@liftgo.net">support@liftgo.net</a>.</p>
    </div>
    <div class="footer">&copy; 2026 LiftGO</div>
  </div>
</body>
</html>`
}

async function logEmail(params: {
  type: string
  recipient: string
  subject: string
  status: string
  resendId?: string | null
  errorMessage?: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  try {
    await supabase.from('email_logs').insert({
      type: params.type,
      email: params.recipient,
      status: params.status,
      resend_email_id: params.resendId ?? null,
      error_message: params.errorMessage ?? null,
      metadata: { subject: params.subject, ...(params.metadata ?? {}) },
    })
  } catch (err) {
    console.error('[resend-email] Failed to write email_log:', err)
  }
}

async function sendViaResend(params: {
  to: string
  subject: string
  html: string
}): Promise<{ id: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY')
  if (!apiKey) throw new Error('RESEND_API_KEY is not set')

  const res = await fetch(RESEND_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [params.to],
      subject: params.subject,
      html: params.html,
    }),
  })

  const body = await res.json()
  if (!res.ok) {
    throw new Error(`Resend API error ${res.status}: ${JSON.stringify(body)}`)
  }
  return body as { id: string }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let payload: EmailRequest
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { type, data } = payload
  if (!type || !data) {
    return new Response(JSON.stringify({ error: 'Missing type or data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let subject: string
  let html: string
  let recipient: string

  try {
    if (type === 'partner_welcome') {
      const d = data as unknown as PartnerWelcomeData
      if (!d.email) throw new Error('Missing email in data')
      recipient = d.email
      subject = `Dobrodošli v LiftGO - ${d.businessName || d.partnerName}`
      html = buildPartnerWelcomeHtml(d)
    } else if (type === 'partner_updated') {
      if (!data.email) throw new Error('Missing email in data')
      recipient = data.email
      subject = 'LiftGO - Posodobitev partnerskega profila'
      html = buildPartnerUpdatedHtml(data)
    } else if (type === 'customer_welcome') {
      if (!data.email) throw new Error('Missing email in data')
      recipient = data.email
      subject = `Dobrodošli v LiftGO, ${data.customerName || 'naročnik'}!`
      html = buildCustomerWelcomeHtml(data)
    } else {
      return new Response(JSON.stringify({ error: `Unknown email type: ${type}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    await logEmail({ type, recipient, subject, status: 'pending' })

    const result = await sendViaResend({ to: recipient, subject, html })

    await logEmail({ type, recipient, subject, status: 'sent', resendId: result.id })

    return new Response(JSON.stringify({ success: true, messageId: result.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[resend-email] Error sending ${type}:`, errorMsg)

    await logEmail({
      type,
      recipient: recipient! ?? data.email ?? 'unknown',
      subject: subject! ?? type,
      status: 'failed',
      errorMessage: errorMsg,
    })

    return new Response(JSON.stringify({ success: false, error: errorMsg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
