/**
 * LiftGO Slack Integration
 *
 * Env vars:
 *   SLACK_WEBHOOK_URL      — existing, for alerts
 *   SLACK_BOT_TOKEN        — xoxb-... for read/write via Bot API
 *   SLACK_CHANNEL_ALERTS   — e.g. #liftgo-alerts
 *   SLACK_CHANNEL_BUSINESS — e.g. #liftgo-narocila
 */

export type SlackSeverity = 'info' | 'warn' | 'critical'

export interface SlackMessage {
  ts: string
  user: string
  text: string
  channel: string
  thread_ts?: string
}

export interface SlackBlock {
  type: string
  [key: string]: unknown
}

async function botApi(
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; error?: string; [key: string]: unknown }> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) {
    console.warn('[Slack] SLACK_BOT_TOKEN ni nastavljen')
    return { ok: false, error: 'missing_token' }
  }
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) console.error(`[Slack] ${method} error:`, data.error)
  return data
}

async function webhookPost(payload: object): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL
  if (!url) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (err) {
    console.error('[Slack] Webhook send failed:', err)
    return false
  }
}

export async function sendMessage(params: {
  channel: string
  text: string
  threadTs?: string
}): Promise<{ ok: boolean; ts?: string }> {
  const res = await botApi('chat.postMessage', {
    channel: params.channel,
    text: params.text,
    ...(params.threadTs ? { thread_ts: params.threadTs } : {}),
  })
  return { ok: res.ok, ts: res.ts as string | undefined }
}

export async function sendRichMessage(params: {
  channel: string
  text: string
  blocks: SlackBlock[]
  threadTs?: string
}): Promise<{ ok: boolean; ts?: string }> {
  const res = await botApi('chat.postMessage', {
    channel: params.channel,
    text: params.text,
    blocks: params.blocks,
    ...(params.threadTs ? { thread_ts: params.threadTs } : {}),
  })
  return { ok: res.ok, ts: res.ts as string | undefined }
}

export type BusinessEventType =
  | 'novo_narocilo'
  | 'nov_narocnik'
  | 'nova_ponudba'
  | 'ponudba_sprejeta'
  | 'placilo_prejeto'
  | 'nov_obrtnik'
  | 'nova_ocena'

export async function sendBusinessEvent(params: {
  event: BusinessEventType
  title: string
  details: Record<string, string | number>
  link?: string
}): Promise<void> {
  const channel = process.env.SLACK_CHANNEL_BUSINESS ?? '#liftgo-narocila'

  const emojiMap: Record<BusinessEventType, string> = {
    novo_narocilo:    '📋',
    nov_narocnik:     '👤',
    nova_ponudba:     '💬',
    ponudba_sprejeta: '✅',
    placilo_prejeto:  '💶',
    nov_obrtnik:      '🔨',
    nova_ocena:       '⭐',
  }

  const emoji = emojiMap[params.event] ?? '📌'

  const fields = Object.entries(params.details).map(([label, value]) => ({
    type: 'mrkdwn',
    text: `*${label}:*\n${value}`,
  }))

  const blocks: SlackBlock[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} ${params.title}`, emoji: true },
    },
    {
      type: 'section',
      fields: fields.slice(0, 10),
    },
    ...(params.link
      ? [
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: { type: 'plain_text', text: 'Odpri v LiftGO', emoji: true },
                url: params.link,
                style: 'primary',
              },
            ],
          },
        ]
      : []),
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `liftgo.net · ${new Date().toLocaleString('sl-SI', { timeZone: 'Europe/Ljubljana' })}`,
        },
      ],
    },
  ]

  await sendRichMessage({ channel, text: `${emoji} ${params.title}`, blocks })
}

export async function sendAlert(params: {
  type: string
  severity: SlackSeverity
  message: string
  metadata?: Record<string, unknown>
}): Promise<void> {
  const emojiMap: Record<SlackSeverity, string> = {
    info:     'ℹ️',
    warn:     '⚠️',
    critical: '🚨',
  }
  const colorMap: Record<SlackSeverity, string> = {
    info:     '#3b82f6',
    warn:     '#fbbf24',
    critical: '#ef4444',
  }

  await webhookPost({
    attachments: [
      {
        color: colorMap[params.severity],
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${emojiMap[params.severity]} *LiftGO ${params.severity.toUpperCase()} — ${params.type}*\n${params.message}`,
            },
          },
          ...(params.metadata
            ? [
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `\`\`\`${JSON.stringify(params.metadata, null, 2)}\`\`\``,
                  },
                },
              ]
            : []),
          {
            type: 'context',
            elements: [{ type: 'mrkdwn', text: new Date().toISOString() }],
          },
        ],
      },
    ],
  })

  const alertChannel = process.env.SLACK_CHANNEL_ALERTS
  if (alertChannel && process.env.SLACK_BOT_TOKEN) {
    await sendMessage({
      channel: alertChannel,
      text: `${emojiMap[params.severity]} *${params.type}* — ${params.message}`,
    })
  }
}

export async function readMessages(params: {
  channel: string
  limit?: number
  oldest?: string
  latest?: string
}): Promise<SlackMessage[]> {
  const res = await botApi('conversations.history', {
    channel: params.channel,
    limit: params.limit ?? 20,
    ...(params.oldest ? { oldest: params.oldest } : {}),
    ...(params.latest ? { latest: params.latest } : {}),
  })
  if (!res.ok || !Array.isArray(res.messages)) return []
  return (res.messages as Record<string, string>[]).map((m) => ({
    ts: m.ts,
    user: m.user ?? 'unknown',
    text: m.text ?? '',
    channel: params.channel,
    thread_ts: m.thread_ts,
  }))
}

export async function listChannels(): Promise<
  { id: string; name: string; is_member: boolean }[]
> {
  const res = await botApi('conversations.list', {
    types: 'public_channel,private_channel',
    limit: 100,
  })
  if (!res.ok || !Array.isArray(res.channels)) return []
  return (res.channels as Record<string, string | boolean>[]).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    is_member: c.is_member as boolean,
  }))
}

export async function readThread(params: {
  channel: string
  threadTs: string
  limit?: number
}): Promise<SlackMessage[]> {
  const res = await botApi('conversations.replies', {
    channel: params.channel,
    ts: params.threadTs,
    limit: params.limit ?? 50,
  })
  if (!res.ok || !Array.isArray(res.messages)) return []
  return (res.messages as Record<string, string>[]).map((m) => ({
    ts: m.ts,
    user: m.user ?? 'unknown',
    text: m.text ?? '',
    channel: params.channel,
    thread_ts: params.threadTs,
  }))
}
