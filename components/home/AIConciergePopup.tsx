'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Bot, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface ConciergeResponse {
  category: string
  estimateMin: number
  estimateMax: number
}

export function AIConciergePopup() {
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ConciergeResponse | null>(null)

  const handleAnalyze = async () => {
    if (!message.trim()) return
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/ai/categorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })
      const data = await res.json()
      if (res.ok) setResult(data)
    } finally {
      setLoading(false)
    }
  }

  const href = result
    ? `/povprasevanje/novo?kategorija=${encodeURIComponent(result.category)}&opis=${encodeURIComponent(message)}`
    : '/povprasevanje/novo'

  return (
    <div className="fixed bottom-6 right-4 z-40 w-[min(92vw,360px)] rounded-2xl border bg-card p-4 shadow-xl">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Bot className="h-4 w-4 text-primary" />
        AI Concierge
      </p>
      <p className="mt-1 text-xs text-muted-foreground">Kaj potrebujete? Napišite ali povejte…</p>
      <Input
        className="mt-3 h-11"
        placeholder="Npr. pušča pipa v kopalnici"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      <Button className="mt-3 h-11 w-full" onClick={handleAnalyze} disabled={loading}>
        <Sparkles className="mr-2 h-4 w-4" />
        {loading ? 'Analiziram…' : 'Predlagaj kategorijo'}
      </Button>

      {result && (
        <div className="mt-3 rounded-lg border bg-muted/50 p-3 text-sm">
          <p><strong>Kategorija:</strong> {result.category}</p>
          <p>
            <strong>Okvirna cena:</strong> {result.estimateMin}€–{result.estimateMax}€
          </p>
          <Button asChild className="mt-3 h-10 w-full" variant="outline">
            <Link href={href}>Nadaljuj na obrazec</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
