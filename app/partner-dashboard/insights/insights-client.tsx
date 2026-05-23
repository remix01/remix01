'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface InsightsMetrics {
  sent: number
  accepted: number
  conversion: number
  avgPrice: number
  // Lead metrics (Rec 8)
  avgMinutesToMatch: number | null    // avg time from request to first assignment
  fallbackRate: number | null         // % leads that required a fallback step
  leadResponseRate: number | null     // % leads where partner responded (vs expired)
  activeLeads: number                 // current active_lead_count
  maxActiveLeads: number              // tier cap
  capacityPct: number                 // activeLeads / maxActiveLeads * 100
}

export default function InsightsClient() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<InsightsMetrics | null>(null)
  const [recommendations, setRecommendations] = useState('')
  const [question, setQuestion] = useState('')
  const [chatResponse, setChatResponse] = useState('')

  useEffect(() => {
    fetch('/api/partner/insights')
      .then(async (res) => {
        const payload = await res.json()
        if (payload?.ok || payload?.success) {
          setMetrics(payload.data.metrics)
          setRecommendations(payload.data.recommendations)
        }
      })
      .catch((err) => console.error('[insights] fetch error:', err))
      .finally(() => setLoading(false))
  }, [])

  const askFollowup = async () => {
    if (!question.trim()) return
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Kot poslovni svetovalec obrtniku odgovori na vprašanje: ${question}. Kontekst: ${JSON.stringify(metrics)}`,
      }),
    })
    const payload = await res.json()
    setChatResponse(payload?.data?.response || payload?.response || 'Ni odgovora.')
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Nalagam AI uvide...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <h1 className="text-3xl font-bold">My Business Advisor</h1>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">Metrike (zadnjih 30 dni)</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Poslane ponudbe</div>
            <div className="text-2xl font-bold">{metrics?.sent ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Sprejete ponudbe</div>
            <div className="text-2xl font-bold">{metrics?.accepted ?? 0}</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Konverzija</div>
            <div className="text-2xl font-bold">{metrics?.conversion ?? 0}%</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Povp. cena</div>
            <div className="text-2xl font-bold">{metrics?.avgPrice ?? 0}€</div>
          </div>
        </div>
      </Card>

      {/* Lead performance metrics (Rec 8) */}
      <Card className="p-6">
        <h2 className="font-semibold mb-3">Metrike leadov</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Povp. čas do dodelitve</div>
            <div className="text-2xl font-bold">
              {metrics?.avgMinutesToMatch != null ? `${metrics.avgMinutesToMatch} min` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">cilj: &lt;2 min</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Stopnja odziva na leade</div>
            <div className={`text-2xl font-bold ${(metrics?.leadResponseRate ?? 0) >= 80 ? 'text-green-600' : 'text-amber-600'}`}>
              {metrics?.leadResponseRate != null ? `${metrics.leadResponseRate}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">% leadov z odgovorom</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Stopnja fallbacka</div>
            <div className={`text-2xl font-bold ${(metrics?.fallbackRate ?? 0) <= 20 ? 'text-green-600' : 'text-red-600'}`}>
              {metrics?.fallbackRate != null ? `${metrics.fallbackRate}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">opozorilo pri &gt;20%</div>
          </div>
          <div className="p-3 rounded-lg bg-muted/50">
            <div className="text-muted-foreground text-xs mb-1">Aktivni leadi</div>
            <div className="text-2xl font-bold">{metrics?.activeLeads ?? 0} / {metrics?.maxActiveLeads ?? '?'}</div>
            <div className="w-full bg-muted rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full ${(metrics?.capacityPct ?? 0) >= 90 ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${Math.min(metrics?.capacityPct ?? 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-3">AI priporočila</h2>
        <div className="text-sm whitespace-pre-wrap">{recommendations}</div>
      </Card>

      <Card className="p-6 space-y-3">
        <h2 className="font-semibold">Vprašaj svetovalca</h2>
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Kako izboljšam konverzijo?"
          />
          <Button onClick={askFollowup}>Vprašaj</Button>
        </div>
        {chatResponse && <div className="text-sm whitespace-pre-wrap">{chatResponse}</div>}
      </Card>
    </div>
  )
}
