'use client'

import { useState } from 'react'
import { Loader2, BarChart2, AlertTriangle, Star, CheckCircle, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type ComparisonItem = {
  ponudbaId: string
  businessName: string
  strengths: string[]
  weaknesses: string[]
  valueScore: number
  comment: string
}

type Analysis = {
  summary: string
  recommendation: string
  warnings: string[]
  comparison: ComparisonItem[]
  avgPrice: number
  priceRange: string
}

interface Props {
  povprasevanjeId: string
  ponudbeCount: number
}

export function OfferComparisonAgent({ povprasevanjeId, ponudbeCount }: Props) {
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  if (ponudbeCount < 2) return null

  const analyze = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/offer-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ povprasevanjeId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')
      setAnalysis(data.analysis)
      setOpen(true)
    } catch (e: any) {
      setError(e.message || 'Napaka pri primerjavi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900 text-sm">AI primerjava ponudb</h3>
        </div>
        {!analysis && (
          <Button
            size="sm"
            onClick={analyze}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-xs"
          >
            {loading ? (
              <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Analiziram...</>
            ) : (
              `Primerjaj ${ponudbeCount} ponudbe`
            )}
          </Button>
        )}
        {analysis && (
          <button
            onClick={() => setOpen(!open)}
            className="text-xs text-blue-600 hover:text-blue-800"
          >
            {open ? 'Skrij' : 'Pokaži analizo'}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}

      {analysis && open && (
        <div className="space-y-4 mt-2">
          {/* Summary */}
          <p className="text-sm text-slate-700">{analysis.summary}</p>

          {/* Price range */}
          {analysis.priceRange && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <span className="font-medium">Razpon cen:</span>
              <Badge variant="outline" className="text-blue-700 border-blue-300">
                {analysis.priceRange}
              </Badge>
            </div>
          )}

          {/* Warnings */}
          {analysis.warnings?.length > 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              {analysis.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          {/* Per-offer breakdown */}
          {analysis.comparison?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Analiza po ponudbah</p>
              {analysis.comparison.map((item, i) => (
                <Card key={item.ponudbaId || i} className="p-3 bg-white border-slate-200">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {analysis.recommendation?.includes(item.ponudbaId) && (
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      )}
                      <span className="text-sm font-medium text-slate-800">{item.businessName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-semibold text-slate-600">{item.valueScore}/10</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-500 mb-2 italic">{item.comment}</p>

                  <div className="grid grid-cols-2 gap-2">
                    {item.strengths?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-green-700 mb-1">Prednosti</p>
                        {item.strengths.map((s, j) => (
                          <div key={j} className="flex items-start gap-1 text-xs text-green-600">
                            <CheckCircle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {item.weaknesses?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-red-700 mb-1">Slabosti</p>
                        {item.weaknesses.map((w, j) => (
                          <div key={j} className="flex items-start gap-1 text-xs text-red-500">
                            <span>•</span>
                            <span>{w}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Recommendation */}
          {analysis.recommendation && (
            <div className="rounded-lg bg-green-50 border border-green-200 p-3 flex items-start gap-2">
              <Trophy className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <p className="text-xs text-green-700">{analysis.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}
