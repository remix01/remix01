'use client'

import { useState } from 'react'
import { Loader2, Sparkles, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

type Variants = { kratek: string; podroben: string; tehnicen: string }
type Result = {
  variants: Variants
  questions: string[]
  suggestedTitle: string
}

type ActiveVariant = keyof Variants

interface Props {
  category?: string
  existingDescription?: string
  onApply: (description: string, title?: string) => void
}

export function TaskDescriptionAssistant({ category, existingDescription, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [keywords, setKeywords] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeVariant, setActiveVariant] = useState<ActiveVariant>('podroben')
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    if (!keywords.trim()) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/agent/task-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keywords, category, existingDescription }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')
      setResult(data)
    } catch (e: any) {
      setError(e.message || 'Napaka pri generiranju.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const variantLabels: Record<ActiveVariant, string> = {
    kratek: 'Kratek',
    podroben: 'Podroben',
    tehnicen: 'Tehničen',
  }

  return (
    <div className="rounded-lg border border-teal-200 bg-teal-50/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          AI asistent za opis dela
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          <p className="text-xs text-teal-600">
            Vnesite ključne besede in AI bo predlagal strukturiran opis.
          </p>

          <div className="flex gap-2">
            <Input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="npr. puščajoča pip, kopalnica, vidna cev"
              className="text-sm bg-white"
              onKeyDown={(e) => e.key === 'Enter' && generate()}
            />
            <Button
              type="button"
              onClick={generate}
              disabled={loading || !keywords.trim()}
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generiraj'}
            </Button>
          </div>

          {error && (
            <p className="text-xs text-red-600">{error}</p>
          )}

          {result && (
            <div className="space-y-3">
              {/* Variant selector */}
              <div className="flex gap-1">
                {(Object.keys(variantLabels) as ActiveVariant[]).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setActiveVariant(v)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                      activeVariant === v
                        ? 'bg-teal-600 text-white'
                        : 'bg-white text-teal-700 border border-teal-200 hover:bg-teal-50'
                    }`}
                  >
                    {variantLabels[v]}
                  </button>
                ))}
              </div>

              {/* Description variant */}
              <Card className="p-3 bg-white relative">
                <p className="text-sm text-slate-700 whitespace-pre-wrap pr-6">
                  {result.variants[activeVariant]}
                </p>
                <button
                  type="button"
                  onClick={() => handleCopy(result.variants[activeVariant])}
                  className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"
                >
                  {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </button>
              </Card>

              {/* Action buttons */}
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => onApply(result.variants[activeVariant], result.suggestedTitle)}
                  className="bg-teal-600 hover:bg-teal-700 text-xs"
                >
                  Uporabi ta opis
                </Button>
                {result.suggestedTitle && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onApply(result.variants[activeVariant], result.suggestedTitle)}
                    className="text-xs border-teal-200 text-teal-700"
                  >
                    + naslov: "{result.suggestedTitle.slice(0, 30)}…"
                  </Button>
                )}
              </div>

              {/* Follow-up questions */}
              {result.questions.length > 0 && (
                <div className="rounded bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Dodatna vprašanja za boljši opis:</p>
                  <ul className="space-y-1">
                    {result.questions.map((q, i) => (
                      <li key={i} className="text-xs text-amber-600">• {q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
