'use client'

import { useState } from 'react'
import { Zap, Star, MapPin, Shield, Loader2, ChevronRight } from 'lucide-react'
import Link from 'next/link'

interface Match {
  obrtnikId: string
  businessName: string
  score: number
  avgRating: number
  locationCity: string
  isVerified: boolean
  categoryMatch: boolean
  distanceKm?: number
}

interface InstantMatchPanelProps {
  povprasevanjeId: string
}

export function InstantMatchPanel({ povprasevanjeId }: InstantMatchPanelProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [reasoning, setReasoning] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleMatch() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/agent/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ povprasevanjeId }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Napaka pri iskanju mojstrov.')
        return
      }

      setMatches(data.matches || [])
      setReasoning(data.reasoning || null)
      setDone(true)
    } catch {
      setError('Omrežna napaka. Poskusite znova.')
    } finally {
      setLoading(false)
    }
  }

  if (!done) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Instant Match</h3>
            <p className="text-sm text-slate-500">AI poišče najboljše mojstre za vaše povpraševanje</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2 mb-3">{error}</p>
        )}

        <button
          onClick={handleMatch}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-slate-300 transition-colors"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Iščem ujemajoče mojstre...</>
          ) : (
            <><Zap className="w-4 h-4" /> Poišči ujemajoče mojstre</>
          )}
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 p-5 border-b bg-blue-50">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">Priporočeni mojstri</h3>
          <p className="text-xs text-slate-500">
            {matches.length > 0 ? `${matches.length} najboljših ujemanj` : 'Ni rezultatov'}
          </p>
        </div>
        <button
          onClick={() => { setDone(false); setMatches([]); setReasoning(null) }}
          className="ml-auto text-xs text-blue-600 hover:underline"
        >
          Ponovi iskanje
        </button>
      </div>

      {reasoning && (
        <div className="px-5 py-3 bg-amber-50 border-b border-amber-100 text-xs text-amber-800">
          {reasoning}
        </div>
      )}

      {matches.length === 0 ? (
        <div className="p-8 text-center text-slate-500">
          <p>Ni ujemajočih mojstrov za to povpraševanje.</p>
          <p className="text-sm mt-1">Preverite kategorijo in lokacijo.</p>
        </div>
      ) : (
        <div className="divide-y">
          {matches.map((match, i) => (
            <div key={match.obrtnikId} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
              {/* Rank */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                i === 0 ? 'bg-yellow-100 text-yellow-700' :
                i === 1 ? 'bg-slate-100 text-slate-600' :
                i === 2 ? 'bg-orange-100 text-orange-600' :
                'bg-slate-50 text-slate-500'
              }`}>
                {i + 1}
              </div>

              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                {match.businessName?.charAt(0)?.toUpperCase() || '?'}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-slate-900 truncate">{match.businessName}</span>
                  {match.isVerified && <Shield className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />}
                  {match.categoryMatch && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Kategorija ✓</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  {match.avgRating > 0 && (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {match.avgRating.toFixed(1)}
                    </span>
                  )}
                  {match.locationCity && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <MapPin className="w-3 h-3" />
                      {match.locationCity}
                      {match.distanceKm != null && ` · ${match.distanceKm.toFixed(0)} km`}
                    </span>
                  )}
                </div>
              </div>

              {/* Score + Link */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm font-bold text-blue-600">{Math.round(match.score)}%</div>
                  <div className="text-xs text-slate-400">ujemanje</div>
                </div>
                <Link
                  href={`/mojstri/${match.obrtnikId}`}
                  className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                  target="_blank"
                >
                  <ChevronRight className="w-4 h-4 text-slate-500" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
