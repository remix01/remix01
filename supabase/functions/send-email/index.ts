// @ts-nocheck
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_URL = 'https://api.resend.com/emails'
const FROM = 'LiftGO <noreply@liftgo.net>'
const FE =
  Deno.env.get('FRONTEND_URL') ||
  'https://v0-liftgo-platform-concept-info-36187542s-projects.vercel.app'
const db = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

async function logEmail(
  type: string,
  email: string,
  subject: string,
  status: string,
  resendId?: string,
  err?: string,
) {
  await db
    .from('email_logs')
    .insert({
      type,
      email,
      status,
      resend_email_id: resendId ?? null,
      error_message: err ?? null,
      metadata: { subject },
    })
    .catch(console.error)
}

async function sendViaResend(to: string, subject: string, html: string) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) throw new Error('RESEND_API_KEY not set')
  const r = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html }),
  })
  const b = await r.json()
  if (!r.ok) throw new Error(`Resend ${r.status}: ${JSON.stringify(b)}`)
  return b as { id: string }
}

const TEMPLATES: Record<
  string,
  (d: Record<string, string>) => { subject: string; html: string }
> = {
  partner_welcome: (d) => ({
    subject: `Dobrodošli v LiftGO - ${d.businessName || d.partnerName}`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f3f4f6;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:40px 30px;text-align:center"><div style="font-size:32px;font-weight:800;letter-spacing:2px;margin-bottom:12px">LIFTGO</div><h1 style="margin:0">Dobrodošli v LiftGO!</h1></div><div style="padding:32px 30px"><p>Pozdravljeni, <strong>${d.partnerName}</strong>!</p><p>Veseli smo, da se pridružujete platformi LiftGO kot partner podjetja <strong>${d.businessName}</strong>.</p><div style="background:#eff6ff;border-left:4px solid #2563eb;padding:16px 20px;margin:20px 0"><strong>Vaš račun je aktiven.</strong> Prijavite se in začnite sprejemati povpraševanja!</div><div style="text-align:center;margin:32px 0"><a href="${d.loginUrl || FE + '/prijava'}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600">Prijava v LiftGO</a></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:14px;color:#6b7280">Imate vprašanja? Pišite nam na <a href="mailto:support@liftgo.net">support@liftgo.net</a></p></div><div style="background:#f9fafb;padding:20px;text-align:center;font-size:13px;color:#6b7280">&copy; 2026 LiftGO. Vse pravice pridržane.</div></div></body></html>`,
  }),

  partner_updated: (d) => ({
    subject: 'LiftGO - Posodobitev partnerskega profila',
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f3f4f6;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:32px 30px;text-align:center"><div style="font-size:28px;font-weight:800;letter-spacing:2px">LIFTGO</div></div><div style="padding:32px 30px"><p>Pozdravljeni, <strong>${d.partnerName || 'Partner'}</strong>!</p><p>Vaš partnerski profil je bil posodobljen.</p><p>Če niste zahtevali spremembe, nas takoj kontaktirajte na <a href="mailto:support@liftgo.net">support@liftgo.net</a>.</p></div><div style="background:#f9fafb;padding:20px;text-align:center;font-size:13px;color:#6b7280">&copy; 2026 LiftGO</div></div></body></html>`,
  }),

  customer_welcome: (d) => ({
    subject: `Dobrodošli v LiftGO, ${d.customerName || 'naročnik'}!`,
    html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;background:#f3f4f6;padding:20px"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden"><div style="background:linear-gradient(135deg,#0d9488,#0f766e);color:#fff;padding:40px 30px;text-align:center"><div style="font-size:32px;font-weight:800;letter-spacing:2px;margin-bottom:12px">LIFTGO</div><h1 style="margin:0">Dobrodošli v LiftGO!</h1></div><div style="padding:32px 30px"><p>Pozdravljeni, <strong>${d.customerName || 'Naročnik'}</strong>!</p><p>Veseli smo, da ste se pridružili platformi LiftGO — najhitrejšemu načinu za iskanje zanesljivih obrtnikov v Sloveniji.</p><div style="background:#f0fdfa;border-left:4px solid #0d9488;padding:16px 20px;margin:20px 0"><strong>V 30 sekundah do pravega obrtnika.</strong> Oddajte povpraševanje in prejmite ponudbe od preverjenih mojstrov.</div><div style="text-align:center;margin:32px 0"><a href="${d.loginUrl || FE + '/narocnik/dashboard'}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:14px 28px;border-radius:8px;font-weight:600">Začni iskati obrtnika</a></div><hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"><p style="font-size:14px;color:#6b7280">Imate vprašanja? Pišite nam na <a href="mailto:support@liftgo.net">support@liftgo.net</a></p></div><div style="background:#f9fafb;padding:20px;text-align:center;font-size:13px;color:#6b7280">&copy; 2026 LiftGO. Vse pravice pridržane.</div></div></body></html>`,
  }),
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

  let payload: { type: string; data: Record<string, string> }
  try {
    payload = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
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

  const tmpl = TEMPLATES[type]
  if (!tmpl) {
    return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!data.email) {
    return new Response(JSON.stringify({ error: 'Missing email in data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { subject, html } = tmpl(data)

  try {
    await logEmail(type, data.email, subject, 'pending')
    const r = await sendViaResend(data.email, subject, html)
    await logEmail(type, data.email, subject, 'sent', r.id)
    return new Response(JSON.stringify({ success: true, messageId: r.id }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[send-email] ${type}:`, msg)
    await logEmail(type, data.email, subject, 'failed', undefined, msg)
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
