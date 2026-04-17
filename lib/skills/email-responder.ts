/**
 * Skill: Avtomatski odgovori na e-pošto (AI Email Responder)
 *
 * Receives an inbound email (parsed by webhook from Gmail/Resend/SMTP),
 * classifies the intent, drafts a Slovenian reply via Claude, and either:
 *   - Sends the reply automatically (for routine inquiries)
 *   - Queues it for human review (for complex/sensitive topics)
 *
 * Intent categories:
 *   routine   → auto-send (tracking, pricing, basic how-to)
 *   support   → auto-draft + human review
 *   complaint → escalate to human immediately
 *   spam      → discard
 *
 * Env:
 *   ANTHROPIC_API_KEY
 *   RESEND_API_KEY   — for sending replies
 *   RESEND_FROM      — e.g. "podrška@liftgo.net"
 */

import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

export type EmailIntent = 'routine' | 'support' | 'complaint' | 'spam'

export interface InboundEmail {
  messageId: string
  from: string          // sender email
  fromName?: string
  subject: string
  bodyText: string      // plain text body
  receivedAt: string    // ISO timestamp
}

export interface EmailResponse {
  messageId: string
  intent: EmailIntent
  draftReply: string
  autoSent: boolean
  confidence: number    // 0–1
  summary: string
}

// ── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Si asistent za stranke platforme LiftGO — slovenskega tržišča za hišne storitve.
Pišeš v slovenščini. Ton je prijazen, profesionalen in jedrnat.

Pravila:
1. Nikoli ne obljubi datumov ali garantiranih rokov, ki jih ne moremo zagotoviti.
2. Za vprašanja o plačilih se sklicuj na "naš podporni tim" (ne rešuj sam).
3. Podpisi so vedno: "Ekipa LiftGO | podrška@liftgo.net"
4. Sporočilo mora biti kratko — max 150 besed.`

// ── Main responder ───────────────────────────────────────────────────────────

export async function processInboundEmail(
  email: InboundEmail
): Promise<EmailResponse> {
  const client = new Anthropic()

  // Step 1: Classify intent
  const classifyMsg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Classify this customer email intent for LiftGO support.
Subject: ${email.subject}
Body: ${email.bodyText.slice(0, 800)}

Respond with ONLY JSON: {"intent":"routine"|"support"|"complaint"|"spam","confidence":0.0-1.0,"summary":"one sentence"}`,
      },
    ],
  })

  let intent: EmailIntent = 'support'
  let confidence = 0.5
  let summary = email.subject

  try {
    const text =
      classifyMsg.content[0].type === 'text' ? classifyMsg.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      intent = parsed.intent ?? 'support'
      confidence = parsed.confidence ?? 0.5
      summary = parsed.summary ?? email.subject
    }
  } catch { /* use defaults */ }

  // Step 2: Draft reply (skip for spam)
  let draftReply = ''

  if (intent !== 'spam') {
    const draftMsg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Napiši odgovor na naslednje e-sporočilo stranke.

Od: ${email.fromName ?? email.from}
Zadeva: ${email.subject}

${email.bodyText.slice(0, 1000)}`,
        },
      ],
    })

    draftReply =
      draftMsg.content[0].type === 'text' ? draftMsg.content[0].text : ''
  }

  // Step 3: Decide whether to auto-send
  const autoSend = intent === 'routine' && confidence >= 0.85

  // Step 4: Persist to Supabase
  const { data: record } = await supabaseAdmin
    .from('email_responses')
    .insert({
      message_id: email.messageId,
      from_email: email.from,
      from_name: email.fromName,
      subject: email.subject,
      intent,
      confidence,
      summary,
      draft_reply: draftReply,
      auto_sent: autoSend,
      status: autoSend ? 'sent' : intent === 'complaint' ? 'escalated' : 'pending_review',
      received_at: email.receivedAt,
    })
    .select()
    .single()

  // Step 5: Auto-send routine replies via Resend
  if (autoSend && draftReply && process.env.RESEND_API_KEY) {
    await sendReply({
      to: email.from,
      subject: `Re: ${email.subject}`,
      body: draftReply,
      inReplyTo: email.messageId,
    })
  }

  return {
    messageId: email.messageId,
    intent,
    draftReply,
    autoSent: autoSend,
    confidence,
    summary,
  }
}

// ── Resend email sender ──────────────────────────────────────────────────────

async function sendReply(params: {
  to: string
  subject: string
  body: string
  inReplyTo: string
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM ?? 'podrska@liftgo.net'

  if (!apiKey) return

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      text: params.body,
      headers: { 'In-Reply-To': params.inReplyTo },
    }),
  })
}
