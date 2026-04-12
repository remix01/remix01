'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'

export default function PartnerInsightsPage() {
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<any>(null)
  const [recommendations, setRecommendations] = useState('')
  const [question, setQuestion] = useState('')
  const [chatResponse, setChatResponse] = useState('')

  useEffect(() => {
    const load = async () => {
      const res = await fetch('/api/partner/insights')
      const payload = await res.json()
      if (payload.success) {
        setMetrics(payload.data.metrics)
        setRecommendations(payload.data.recommendations)
      }
      setLoading(false)
    }
    load()
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

  if (loading) return <div className="p-6">Nalagam AI uvide...</div>

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
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
            <Input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Kako izboljšam konverzijo?" />
            <Button onClick={askFollowup}>Vprašaj</Button>
          </div>
          {chatResponse && <div className="text-sm whitespace-pre-wrap">{chatResponse}</div>}
        </Card>
      </div>

      <PartnerBottomNav paket={{ paket: 'pro' }} />
    </div>
  )
}
