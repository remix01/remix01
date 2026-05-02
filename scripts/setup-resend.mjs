#!/usr/bin/env node
/**
 * LiftGO — Resend one-shot setup
 * Creates events, segments, automations, and broadcast drafts.
 *
 * Run: node scripts/setup-resend.mjs
 * Requires: RESEND_API_KEY env var OR edit the KEY constant below.
 */

const KEY = process.env.RESEND_API_KEY || 're_73eAyYzU_65knQF9MTS6fR2T4YCYhQBTc'
const FROM = 'LiftGO <noreply@liftgo.net>'
const BASE = 'https://api.resend.com'

// ─── helpers ────────────────────────────────────────────────────────────────

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(json)}`)
  return json
}

const get  = (path)        => api('GET',    path)
const post = (path, body)  => api('POST',   path, body)

function ok(label)  { console.log(`  ✅ ${label}`) }
function skip(label){ console.log(`  ⏭  ${label} (already exists)`) }
function section(s) { console.log(`\n── ${s} ──`) }

// ─── check / create helpers ─────────────────────────────────────────────────

async function ensureEvent(name, schema) {
  const { data } = await get('/v1/events')
  const existing = (data || []).find(e => e.name === name)
  if (existing) { skip(`event:${name}`); return existing.id }
  const created = await post('/v1/events', { name, schema })
  ok(`event:${name}`)
  return created.id
}

async function ensureSegment(audienceId, name) {
  const { data } = await get(`/audiences/${audienceId}/segments`)
  const existing = (data || []).find(s => s.name === name)
  if (existing) { skip(`segment:${name}`); return existing.id }
  const created = await post(`/audiences/${audienceId}/segments`, { name })
  ok(`segment:${name}`)
  return created.id
}

async function ensureAutomation(name, workflow) {
  const { data } = await get('/automations')
  const existing = (data || []).find(a => a.name === name)
  if (existing) { skip(`automation:${name}`); return existing.id }
  const created = await post('/automations', { name, status: 'enabled', workflow })
  ok(`automation:${name}`)
  return created.id
}

async function ensureBroadcast(name, segmentId, subject, html, text) {
  const { data } = await get('/broadcasts')
  const existing = (data || []).find(b => b.name === name)
  if (existing) { skip(`broadcast:${name}`); return existing.id }
  const created = await post('/broadcasts', {
    name, from: FROM, subject,
    audience_id: segmentId,
    html, text,
  })
  ok(`broadcast:${name} (draft)`)
  return created.id
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 LiftGO — Resend setup\n')

  // 0. Get audience (first one = default)
  section('Audiences')
  const { data: audiences } = await get('/audiences')
  if (!audiences?.length) throw new Error('No Resend audience found. Create one at resend.com/audiences first.')
  const audienceId = audiences[0].id
  ok(`audience: ${audiences[0].name} (${audienceId})`)

  // ── 1. Events ──────────────────────────────────────────────────────────────
  section('Events')
  const events = {}
  events.customerRegistered   = await ensureEvent('liftgo.customer.registered',   { userId: 'string', name: 'string', email: 'string' })
  events.providerApproved     = await ensureEvent('liftgo.provider.approved',      { userId: 'string', name: 'string', email: 'string', service: 'string' })
  events.taskCreated          = await ensureEvent('liftgo.task.created',           { taskId: 'string', customerName: 'string', category: 'string', location: 'string' })
  events.ponudbaAccepted      = await ensureEvent('liftgo.ponudba.accepted',       { taskId: 'string', ponudbaId: 'string', customerName: 'string', providerName: 'string', scheduledDate: 'string' })
  events.taskCompleted        = await ensureEvent('liftgo.task.completed',         { taskId: 'string', customerName: 'string', providerName: 'string', service: 'string' })
  events.paymentSucceeded     = await ensureEvent('liftgo.payment.succeeded',      { transactionId: 'string', customerName: 'string', providerName: 'string', amountEur: 'number' })
  events.paymentFailed        = await ensureEvent('liftgo.payment.failed',         { transactionId: 'string', customerName: 'string', reason: 'string' })
  events.accountSuspended     = await ensureEvent('liftgo.account.suspended',      { userId: 'string', name: 'string', reason: 'string' })

  // ── 2. Segments ────────────────────────────────────────────────────────────
  section('Segments')
  const seg = {}
  seg.narocniki     = await ensureSegment(audienceId, 'Naročniki (customers)')
  seg.obrtniki      = await ensureSegment(audienceId, 'Obrtniki (craftsmen)')
  seg.obrtnikiStart = await ensureSegment(audienceId, 'Obrtniki — START tier')
  seg.obrtnikiPro   = await ensureSegment(audienceId, 'Obrtniki — PRO tier')

  // ── 3. Automations ─────────────────────────────────────────────────────────
  section('Automations')

  // 3a. Welcome — customer
  await ensureAutomation('Welcome — Naročnik', {
    steps: [
      { key: 'trigger', type: 'trigger', config: { eventName: 'liftgo.customer.registered' }, next: 'send_welcome' },
      { key: 'send_welcome', type: 'send_email', config: {
          from: FROM,
          subject: 'Dobrodošli v LiftGO! 🎉',
          template: null,
          html: `<p>Pozdravljeni {{{contact.first_name|Naročnik}}},</p>
<p>Hvala, da ste se pridružili LiftGO! Zdaj lahko v manj kot 30 sekundah najdete zanesljivega obrtnika.</p>
<p><a href="https://liftgo.net/narocnik/novo-povprasevanje" style="background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Oddaj prvo povpraševanje →</a></p>
<p style="color:#94a3b8;font-size:12px">LiftGO — najdi obrtnika v Sloveniji</p>`,
        }, next: null },
    ],
  })

  // 3b. Welcome — provider
  await ensureAutomation('Welcome — Obrtnik', {
    steps: [
      { key: 'trigger', type: 'trigger', config: { eventName: 'liftgo.provider.approved' }, next: 'send_welcome' },
      { key: 'send_welcome', type: 'send_email', config: {
          from: FROM,
          subject: 'Dobrodošli v LiftGO — vaš profil je odobren ✅',
          html: `<p>Pozdravljeni {{{contact.first_name|Mojster}}},</p>
<p>Vaš obrtniški profil je bil odobren! Zdaj ste vidni strankam v vaši regiji.</p>
<p><a href="https://liftgo.net/obrtnik/povprasevanja" style="background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Poišči nova povpraševanja →</a></p>
<p><strong>💡 Nasvet:</strong> Obrtniki, ki odgovorijo v 1h, dobijo 3× več poslov.</p>
<p style="color:#94a3b8;font-size:12px">LiftGO — rastite z nami</p>`,
        }, next: null },
    ],
  })

  // 3c. New task → notify providers (event-based, targeting handled in app)
  await ensureAutomation('Nova naloga — obvestilo obrtnikov', {
    steps: [
      { key: 'trigger', type: 'trigger', config: { eventName: 'liftgo.task.created' }, next: 'send_notify' },
      { key: 'send_notify', type: 'send_email', config: {
          from: FROM,
          subject: 'Novo povpraševanje: {{{event.category}}} v {{{event.location}}}',
          html: `<p>Pozdravljeni,</p>
<p>Stranka <strong>{{{event.customerName}}}</strong> išče pomoč pri <strong>{{{event.category}}}</strong> v kraju <strong>{{{event.location}}}</strong>.</p>
<p><a href="https://liftgo.net/obrtnik/povprasevanja/{{{event.taskId}}}" style="background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Poglej povpraševanje →</a></p>
<p style="color:#94a3b8;font-size:12px">LiftGO — odgovori hitro, zmaga tisti, ki je prvi</p>`,
        }, next: null },
    ],
  })

  // 3d. Ponudba accepted — notify both parties
  await ensureAutomation('Ponudba sprejeta — obvestilo', {
    steps: [
      { key: 'trigger', type: 'trigger', config: { eventName: 'liftgo.ponudba.accepted' }, next: 'send_confirm' },
      { key: 'send_confirm', type: 'send_email', config: {
          from: FROM,
          subject: 'Ponudba je bila sprejeta! 🤝',
          html: `<p>Pozdravljeni,</p>
<p>Ponudba za nalogo <strong>{{{event.taskId}}}</strong> je bila sprejeta.</p>
<ul>
  <li>Stranka: <strong>{{{event.customerName}}}</strong></li>
  <li>Obrtnik: <strong>{{{event.providerName}}}</strong></li>
  <li>Datum: <strong>{{{event.scheduledDate}}}</strong></li>
</ul>
<p><a href="https://liftgo.net/narocnik/povprasevanja/{{{event.taskId}}}" style="background:#0d9488;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Odpri nalogo →</a></p>`,
        }, next: null },
    ],
  })

  // 3e. Task completed → request review (with 24h delay)
  await ensureAutomation('Zahteva za oceno — 24h po zaključku', {
    steps: [
      { key: 'trigger',      type: 'trigger', config: { eventName: 'liftgo.task.completed' }, next: 'delay_24h' },
      { key: 'delay_24h',    type: 'delay',   config: { duration: '24 hours' },               next: 'send_review' },
      { key: 'send_review',  type: 'send_email', config: {
          from: FROM,
          subject: 'Kako je šlo? Ocenite svojega obrtnika ⭐',
          html: `<p>Pozdravljeni {{{contact.first_name|Naročnik}}},</p>
<p>Vaša naloga z obrtnikom <strong>{{{event.providerName}}}</strong> je bila zaključena.</p>
<p>Z oceno pomagate drugim strankam in nagradite dobro delo.</p>
<p><a href="https://liftgo.net/narocnik/ocena/{{{event.taskId}}}" style="background:#f59e0b;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Ocenite obrtnika →</a></p>
<p style="color:#94a3b8;font-size:12px">Ocena vam vzame manj kot 30 sekund.</p>`,
        }, next: null },
    ],
  })

  // 3f. Payment succeeded
  await ensureAutomation('Plačilo potrjeno', {
    steps: [
      { key: 'trigger', type: 'trigger', config: { eventName: 'liftgo.payment.succeeded' }, next: 'send_confirm' },
      { key: 'send_confirm', type: 'send_email', config: {
          from: FROM,
          subject: 'Plačilo potrjeno — {{{event.amountEur}}} EUR ✅',
          html: `<p>Pozdravljeni {{{contact.first_name}}},</p>
<p>Vaše plačilo v višini <strong>{{{event.amountEur}}} EUR</strong> je bilo uspešno obdelano.</p>
<p>Transakcija: <code>{{{event.transactionId}}}</code></p>
<p style="color:#94a3b8;font-size:12px">LiftGO — varna plačila</p>`,
        }, next: null },
    ],
  })

  // 3g. Payment failed
  await ensureAutomation('Plačilo neuspešno', {
    steps: [
      { key: 'trigger', type: 'trigger', config: { eventName: 'liftgo.payment.failed' }, next: 'send_alert' },
      { key: 'send_alert', type: 'send_email', config: {
          from: FROM,
          subject: 'Plačilo ni uspelo — ukrepajte prosimo',
          html: `<p>Pozdravljeni {{{contact.first_name}}},</p>
<p>Žal nam je, ampak vaše plačilo ni bilo uspešno obdelano.</p>
<p>Razlog: <strong>{{{event.reason}}}</strong></p>
<p><a href="https://liftgo.net/narocnik/dashboard" style="background:#ef4444;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block">Posodobite plačilne podatke →</a></p>`,
        }, next: null },
    ],
  })

  // 3h. Account suspended
  await ensureAutomation('Račun začasno blokiran', {
    steps: [
      { key: 'trigger', type: 'trigger', config: { eventName: 'liftgo.account.suspended' }, next: 'send_notice' },
      { key: 'send_notice', type: 'send_email', config: {
          from: FROM,
          subject: 'Vaš račun LiftGO je začasno blokiran',
          html: `<p>Pozdravljeni {{{contact.first_name}}},</p>
<p>Vaš račun je bil začasno blokiran.</p>
<p>Razlog: <strong>{{{event.reason}}}</strong></p>
<p>Če menite, da je prišlo do napake, nas kontaktirajte:</p>
<p><a href="mailto:info@liftgo.net">info@liftgo.net</a></p>`,
        }, next: null },
    ],
  })

  // ── 4. Broadcasts (drafts) ─────────────────────────────────────────────────
  section('Broadcasts (drafts)')

  await ensureBroadcast(
    'LiftGO Launch — Naročniki',
    seg.narocniki,
    'LiftGO je tukaj — najdi obrtnika v 30 sekundah 🚀',
    `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f8fafc">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td bgcolor="#0d9488" align="center" style="padding:32px 24px">
  <h1 style="color:white;font-family:Arial,sans-serif;font-size:28px;margin:0">LiftGO je tu! 🎉</h1>
</td></tr>
<tr><td bgcolor="#ffffff" style="padding:32px 24px;font-family:Arial,sans-serif;font-size:16px;color:#334155;line-height:1.6">
  <p>Pozdravljeni {{{FIRST_NAME|Naročnik}}},</p>
  <p>LiftGO je slovenska platforma, ki vas v manj kot 30 sekundah poveže z zanesljivim obrtnikom.</p>
  <ul>
    <li>Opišite delo</li>
    <li>Prejmite ponudbe</li>
    <li>Izberite najboljšo</li>
  </ul>
  <p style="text-align:center;margin:32px 0">
    <a href="https://liftgo.net/narocnik/novo-povprasevanje" style="background:#0d9488;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;font-family:Arial,sans-serif">Oddaj povpraševanje →</a>
  </p>
  <p style="color:#94a3b8;font-size:12px;text-align:center">
    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#94a3b8">Odjava</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`,
    `Pozdravljeni,\n\nLiftGO je slovenska platforma za iskanje obrtnikov.\nOddaj povpraševanje: https://liftgo.net/narocnik/novo-povprasevanje\n\nOdjava: {{{RESEND_UNSUBSCRIBE_URL}}}`
  )

  await ensureBroadcast(
    'LiftGO Launch — Obrtniki',
    seg.obrtniki,
    'Novi posli čakajo — LiftGO prinaša stranke k vam 🛠️',
    `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f8fafc">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td bgcolor="#1e40af" align="center" style="padding:32px 24px">
  <h1 style="color:white;font-family:Arial,sans-serif;font-size:28px;margin:0">Novi posli — vsak dan 🛠️</h1>
</td></tr>
<tr><td bgcolor="#ffffff" style="padding:32px 24px;font-family:Arial,sans-serif;font-size:16px;color:#334155;line-height:1.6">
  <p>Pozdravljeni {{{FIRST_NAME|Mojster}}},</p>
  <p>LiftGO vsak dan prinaša nove stranke, ki iščejo točno to, kar vi znate.</p>
  <ul>
    <li>Brezplačen START profil</li>
    <li>PRO za 29 €/mes — neomejene ponudbe + AI asistent</li>
    <li>Plačate samo ko dobite posel</li>
  </ul>
  <p style="text-align:center;margin:32px 0">
    <a href="https://liftgo.net/obrtnik/povprasevanja" style="background:#1e40af;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;font-family:Arial,sans-serif">Poišči povpraševanja →</a>
  </p>
  <p style="color:#94a3b8;font-size:12px;text-align:center">
    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#94a3b8">Odjava</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`,
    `Pozdravljeni,\n\nLiftGO prinaša nove stranke obrtnikovom vsak dan.\nPoišči povpraševanja: https://liftgo.net/obrtnik/povprasevanja\n\nOdjava: {{{RESEND_UNSUBSCRIBE_URL}}}`
  )

  await ensureBroadcast(
    'PRO naročnina — poziv k nadgradnji',
    seg.obrtnikiStart,
    'Odklenite PRO in zaslužite 3× več z LiftGO ⚡',
    `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#f8fafc">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px">
<tr><td bgcolor="#7c3aed" align="center" style="padding:32px 24px">
  <h1 style="color:white;font-family:Arial,sans-serif;font-size:28px;margin:0">Nadgradite na PRO ⚡</h1>
</td></tr>
<tr><td bgcolor="#ffffff" style="padding:32px 24px;font-family:Arial,sans-serif;font-size:16px;color:#334155;line-height:1.6">
  <p>Pozdravljeni {{{FIRST_NAME|Mojster}}},</p>
  <p>Z LiftGO PRO (29 €/mes) odklenete:</p>
  <ul>
    <li>✅ Neomejeno pošiljanje ponudb</li>
    <li>✅ AI generator ponudb — varčuje 2h/teden</li>
    <li>✅ Video diagnoza — ocenite delo brez obiska</li>
    <li>✅ Samo 5% provizija (START = 10%)</li>
  </ul>
  <p style="text-align:center;margin:32px 0">
    <a href="https://liftgo.net/obrtnik/narocnine" style="background:#7c3aed;color:white;padding:14px 28px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;font-family:Arial,sans-serif">Nadgradi na PRO →</a>
  </p>
  <p style="color:#94a3b8;font-size:12px;text-align:center">
    <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#94a3b8">Odjava</a>
  </p>
</td></tr>
</table></td></tr></table>
</body></html>`,
    `Pozdravljeni,\n\nZ LiftGO PRO (29€/mes) zaslužite 3× več.\nNadgradite: https://liftgo.net/obrtnik/narocnine\n\nOdjava: {{{RESEND_UNSUBSCRIBE_URL}}}`
  )

  console.log('\n✅ Setup complete!\n')
  console.log('Next steps:')
  console.log('  • Fire events from your app via resend.events.send()')
  console.log('  • Review broadcast drafts at resend.com/broadcasts before sending')
  console.log('  • Sync contacts to audience segments as users register')
}

main().catch(e => { console.error('\n❌', e.message); process.exit(1) })
