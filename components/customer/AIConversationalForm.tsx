'use client'

import { useState } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ParsedInquiry {
  title?: string
  description?: string
  suggestedCategory?: string
  urgency?: 'normalno' | 'kmalu' | 'nujno'
  followUpQuestions?: string[]
}

export function AIConversationalForm({
  onApply,
}: {
  onApply: (parsed: ParsedInquiry) => void
}) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [followUps, setFollowUps] = useState<string[]>([])

  const handleAnalyze = async () => {
    if (!input.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/parse-inquiry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      })
      const json = await res.json()
      if (!res.ok || !json?.success) {
        throw new Error(json?.error || 'AI analiza ni uspela')
      }

      onApply(json.data)
      setFollowUps(json.data?.followUpQuestions || [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Napaka pri AI analizi')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4 border-blue-200 bg-blue-50/50">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <h3 className="text-sm font-semibold text-blue-900">AI čarovnik za povpraševanje</h3>
      </div>
      <p className="text-xs text-blue-800 mb-3">Na kratko opišite težavo in AI bo predlagal naslov, opis ter nujnost.</p>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Primer: V kopalnici mi pušča cev pod umivalnikom, potrebujem hitro popravilo v Ljubljani."
        className="bg-white"
      />
      {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      {followUps.length > 0 && (
        <div className="mt-3 rounded-md bg-white p-3 border border-blue-100">
          <p className="text-xs font-medium text-blue-900 mb-1">Dodatna vprašanja AI:</p>
          <ul className="list-disc pl-4 text-xs text-blue-800 space-y-1">
            {followUps.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      )}
      <Button
        type="button"
        onClick={handleAnalyze}
        disabled={loading || !input.trim()}
        className="mt-3 bg-blue-600 hover:bg-blue-700"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analiziram...
          </>
        ) : (
          'AI predlog'
        )}
      </Button>
    </Card>
  )
}
