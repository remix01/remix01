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
        if (payload.success) {
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
        <div className="grid md:grid-cols-4 gap-3 text-sm">
          <div>Poslane: <strong>{metrics?.sent ?? 0}</strong></div>
          <div>Sprejete: <strong>{metrics?.accepted ?? 0}</strong></div>
          <div>Konverzija: <strong>{metrics?.conversion ?? 0}%</strong></div>
          <div>Povp. cena: <strong>{metrics?.avgPrice ?? 0}€</strong></div>
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
