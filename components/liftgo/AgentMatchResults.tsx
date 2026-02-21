'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChevronRight } from 'lucide-react'

interface MatchResult {
  obrtknikId: string
  businessName: string
  score: number
  reasons: string[]
  estimatedPrice?: string
}

interface AgentMatchResultsProps {
  povprasevanjeId: string
  onSelectObrtnik?: (obrtknikId: string) => void
}

export function AgentMatchResults({ povprasevanjeId, onSelectObrtnik }: AgentMatchResultsProps) {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<MatchResult[] | null>(null)
  const [reasoning, setReasoning] = useState<string>('')
  const [error, setError] = useState<string>('')

  const handleFindMatches = async () => {
    setLoading(true)
    setError('')
    setResults(null)

    try {
      const response = await fetch('/api/agent/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ povprasevanjeId }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Napaka pri iskanju obrtnov')
      }

      const data = await response.json()
      setResults(data.matches || [])
      setReasoning(data.reasoning || '')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Napaka pri iskanju obrtnov')
    } finally {
      setLoading(false)
    }
  }

  const getScoreBadgeColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-800'
    if (score >= 70) return 'bg-orange-100 text-orange-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="mb-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-2xl">🤖</div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Priporočila</h3>
            <p className="text-sm text-gray-600">Agent analizira povpraševanje in predlaga najbolje obrtnike</p>
          </div>
        </div>
        <Badge variant="outline" className="bg-blue-100 text-blue-800">
          Beta
        </Badge>
      </div>

      {!results && !loading && !error && (
        <Button
          onClick={handleFindMatches}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Poišči najboljše mojstre
        </Button>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center gap-3 py-8">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
          <p className="text-gray-600">Agent analizira povpraševanje...</p>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div className="rounded-lg bg-red-50 p-4">
          <p className="text-red-800">
            <strong>Napaka:</strong> {error}
          </p>
          <Button
            onClick={handleFindMatches}
            variant="outline"
            size="sm"
            className="mt-3"
          >
            Poskusite znova
          </Button>
        </div>
      )}

      {/* Results */}
      {results && results.length > 0 && (
        <div className="space-y-4">
          {/* Match Cards */}
          {results.map((match) => (
            <Card
              key={match.obrtknikId}
              className="border-l-4 border-l-blue-500 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Score and Name */}
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-lg font-bold text-gray-900">
                      {match.businessName}
                    </h4>
                    <Badge className={`${getScoreBadgeColor(match.score)} text-sm font-semibold`}>
                      {match.score}/100
                    </Badge>
                  </div>

                  {/* Reasons */}
                  <div className="mb-3 space-y-1">
                    {match.reasons.map((reason, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-0.5 text-green-600">✓</span>
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>

                  {/* Estimated Price */}
                  {match.estimatedPrice && (
                    <p className="text-sm font-semibold text-blue-600">
                      💰 Ocenjena cena: {match.estimatedPrice}
                    </p>
                  )}
                </div>

                {/* CTA Button */}
                <Button
                  onClick={() => onSelectObrtnik?.(match.obrtknikId)}
                  variant="outline"
                  size="sm"
                  className="mt-1 whitespace-nowrap"
                >
                  Povabi
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}

          {/* Reasoning */}
          {reasoning && (
            <div className="rounded-lg bg-white p-4 text-sm italic text-gray-600">
              <strong>Agent:</strong> {reasoning}
            </div>
          )}

          {/* New Search Button */}
          <Button
            onClick={() => {
              setResults(null)
              setReasoning('')
              handleFindMatches()
            }}
            variant="outline"
            size="sm"
            className="mt-4 w-full"
          >
            Poišči znova
          </Button>
        </div>
      )}

      {/* No Results */}
      {results && results.length === 0 && !loading && !error && (
        <div className="rounded-lg bg-orange-50 p-4 text-center">
          <p className="text-orange-800">
            Agent trenutno ne more priporočiti nobenega obrtnika. Poskusite pozneje ali spremenite
            povpraševanje.
          </p>
        </div>
      )}
    </div>
  )
}
