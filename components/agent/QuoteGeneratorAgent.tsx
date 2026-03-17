'use client'

import { useState } from 'react'
import { Loader2, Sparkles, ChevronDown, ChevronUp, Zap, TrendingUp, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type UpsellItem = { title: string; description: string; priceEstimate: number }

type Quote = {
  draftMessage: string
  priceEstimate: number | null
  priceType: string
  priceRationale: string
  suggestedDate: string | null
  estimatedDuration: string
  upsellSuggestions: UpsellItem[]
  confidence: string
  notes?: string
}

interface Props {
  povprasevanjeId: string
  categoryName?: string
  onApply: (message: string, price: number | null, priceType: string, date: string | null) => void
}

const CONFIDENCE_COLORS: Record<string, string> = {
  visoka: 'bg-green-100 text-green-700',
  srednja: 'bg-amber-100 text-amber-700',
  nizka: 'bg-red-100 text-red-700',
}

export function QuoteGeneratorAgent({ povprasevanjeId, categoryName, onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [hourlyRate, setHourlyRate] = useState('')
  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/partner/quick-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          povprasevanjeId,
          hourlyRate: hourlyRate ? Number(hourlyRate) : undefined,
          includeUpsell: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')
      setQuote(data.quote)
    } catch (e: any) {
      setError(e.message || 'Napaka pri generiranju.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!quote) return
    await navigator.clipboard.writeText(quote.draftMessage)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-lg border border-orange-200 bg-orange-50/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <Zap className="w-4 h-4" />
          AI hitri generator ponudbe
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-3">
          <p className="text-xs text-orange-600">
            AI prebere povpraševanje in pripravi osnutek ponudbe glede na vaš profil.
          </p>

          <div className="flex gap-2">
            <Input
              type="number"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(e.target.value)}
              placeholder="Urna postavka EUR (neobvezno)"
              className="text-sm bg-white"
            />
            <Button
              type="button"
              onClick={generate}
              disabled={loading}
              size="sm"
              className="bg-orange-600 hover:bg-orange-700 shrink-0"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Generiraj'}
            </Button>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {quote && (
            <div className="space-y-3">
              {/* Draft message */}
              <Card className="p-3 bg-white relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-slate-500">Osnutek sporočila</p>
                  <div className="flex items-center gap-2">
                    {quote.confidence && (
                      <Badge className={`text-xs ${CONFIDENCE_COLORS[quote.confidence] || ''}`}>
                        {quote.confidence}
                      </Badge>
                    )}
                    <button type="button" onClick={handleCopy} className="text-slate-400 hover:text-slate-600">
                      {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{quote.draftMessage}</p>
              </Card>

              {/* Price & duration */}
              <div className="grid grid-cols-2 gap-2">
                {quote.priceEstimate !== null && (
                  <Card className="p-2 bg-white">
                    <p className="text-xs text-slate-500 mb-0.5">Predlagana cena</p>
                    <p className="font-bold text-orange-700">{quote.priceEstimate} EUR</p>
                    <p className="text-xs text-slate-400">{quote.priceType}</p>
                    {quote.priceRationale && (
                      <p className="text-xs text-slate-500 mt-1 italic">{quote.priceRationale}</p>
                    )}
                  </Card>
                )}
                {quote.estimatedDuration && (
                  <Card className="p-2 bg-white">
                    <p className="text-xs text-slate-500 mb-0.5">Čas izvedbe</p>
                    <p className="font-medium text-slate-700">{quote.estimatedDuration}</p>
                    {quote.suggestedDate && (
                      <p className="text-xs text-slate-500 mt-1">
                        Predlog: {new Date(quote.suggestedDate).toLocaleDateString('sl-SI')}
                      </p>
                    )}
                  </Card>
                )}
              </div>

              {/* Apply button */}
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  onApply(
                    quote.draftMessage,
                    quote.priceEstimate,
                    quote.priceType,
                    quote.suggestedDate
                  )
                }
                className="bg-orange-600 hover:bg-orange-700 w-full"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Uporabi ta osnutek
              </Button>

              {/* Upsell suggestions */}
              {quote.upsellSuggestions?.length > 0 && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <p className="text-xs font-semibold text-blue-700">Predlogi navzkrižne prodaje</p>
                  </div>
                  {quote.upsellSuggestions.map((item, i) => (
                    <div key={i} className="mb-2 last:mb-0">
                      <p className="text-xs font-medium text-blue-800">{item.title}</p>
                      <p className="text-xs text-blue-600">{item.description}</p>
                      {item.priceEstimate > 0 && (
                        <p className="text-xs text-blue-500">~{item.priceEstimate} EUR</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Internal notes */}
              {quote.notes && (
                <p className="text-xs text-slate-400 italic">💡 {quote.notes}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
