'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Bell, Mail, Bot, Zap, Send } from 'lucide-react'

type IntegrationStatus = 'unknown' | 'ok' | 'error' | 'missing'

interface Integration {
  name: string
  description: string
  envVar: string
  icon: React.ReactNode
  testable?: boolean
}

const integrations: Integration[] = [
  {
    name: 'Slack',
    description: 'Obvestila za sistemske alarme in anomalije agenta',
    envVar: 'SLACK_WEBHOOK_URL',
    icon: <Bell className="w-5 h-5" />,
    testable: true,
  },
  {
    name: 'Anthropic AI',
    description: 'Claude AI za chatbot asistenta',
    envVar: 'ANTHROPIC_API_KEY',
    icon: <Bot className="w-5 h-5" />,
  },
  {
    name: 'Resend Email',
    description: 'Pošiljanje email obvestil in alarmov',
    envVar: 'RESEND_API_KEY',
    icon: <Mail className="w-5 h-5" />,
  },
  {
    name: 'Stripe',
    description: 'Plačilni sistem za naročila',
    envVar: 'STRIPE_SECRET_KEY',
    icon: <Zap className="w-5 h-5" />,
  },
]

export default function IntegracijeAdminPage() {
  const [slackStatus, setSlackStatus] = useState<IntegrationStatus>('unknown')
  const [slackMessage, setSlackMessage] = useState('')
  const [isTesting, setIsTesting] = useState(false)

  const testSlack = async () => {
    setIsTesting(true)
    setSlackMessage('')
    try {
      const res = await fetch('/api/admin/test-slack', { method: 'POST' })
      const data = await res.json()
      if (res.ok) {
        setSlackStatus('ok')
        setSlackMessage(data.message || 'Test sporočilo poslano!')
      } else {
        setSlackStatus('error')
        setSlackMessage(data.error || 'Napaka pri pošiljanju.')
      }
    } catch {
      setSlackStatus('error')
      setSlackMessage('Omrežna napaka. Preverite povezavo.')
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Integracije</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pregled in testiranje zunanjih integracij LiftGO platforme.
        </p>
      </div>

      {/* Slack Card — detailed */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Slack Webhook</h2>
              <p className="text-sm text-slate-500">Alarmi za SLA, varnostne anomalije, napake agenta</p>
            </div>
          </div>
          {slackStatus === 'ok' && (
            <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
              <CheckCircle2 className="w-4 h-4" /> Deluje
            </span>
          )}
          {slackStatus === 'error' && (
            <span className="flex items-center gap-1 text-sm text-red-500 font-medium">
              <XCircle className="w-4 h-4" /> Napaka
            </span>
          )}
        </div>

        <div className="mt-5 space-y-3">
          <div className="bg-slate-50 rounded-lg p-4 text-sm">
            <p className="font-medium text-slate-700 mb-2">Kako nastaviti Slack Webhook:</p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>Pojdi na <strong>api.slack.com/apps</strong> → ustvari novo aplikacijo</li>
              <li>Izberi <strong>From scratch</strong> → ime: "LiftGO Alerts" → izberi workspace</li>
              <li>V meniju levo klikni <strong>Incoming Webhooks</strong> → aktiviraj</li>
              <li>Klikni <strong>Add New Webhook to Workspace</strong> → izberi kanal (npr. #alerts)</li>
              <li>Kopiraj Webhook URL (začne se s <code className="bg-slate-200 px-1 rounded">https://hooks.slack.com/services/...</code>)</li>
              <li>V <strong>Vercel Dashboard</strong> → Settings → Environment Variables dodaj:<br/>
                <code className="bg-slate-200 px-1 rounded text-xs mt-1 inline-block">SLACK_WEBHOOK_URL = https://hooks.slack.com/services/XXX/YYY/ZZZ</code>
              </li>
              <li>Redeploy aplikacije v Vercel</li>
            </ol>
          </div>

          {slackMessage && (
            <div className={`rounded-lg px-4 py-3 text-sm ${
              slackStatus === 'ok'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {slackMessage}
            </div>
          )}

          <button
            onClick={testSlack}
            disabled={isTesting}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:bg-slate-300 transition-colors"
          >
            {isTesting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Testiram...</>
            ) : (
              <><Send className="w-4 h-4" /> Pošlji test sporočilo</>
            )}
          </button>
        </div>
      </div>

      {/* Other integrations */}
      <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        <div className="p-4">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Ostale integracije</h2>
        </div>
        {integrations.slice(1).map(integration => (
          <div key={integration.envVar} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                {integration.icon}
              </div>
              <div>
                <p className="font-medium text-slate-800 text-sm">{integration.name}</p>
                <p className="text-xs text-slate-500">{integration.description}</p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">{integration.envVar}</span>
          </div>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
        <p className="font-medium mb-1">Okoljske spremenljivke</p>
        <p>Vse ključe nastavi v <strong>Vercel Dashboard → Settings → Environment Variables</strong>.
        Po vsaki spremembi je potreben redeploy.</p>
      </div>
    </div>
  )
}
